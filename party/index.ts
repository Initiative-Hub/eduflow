import type * as Party from 'partykit/server';
import { createFinalization, deliverFinalization } from './finalization';
import {
  sha256Hex,
  verifyLiveGameServiceRequest,
  verifyLiveGameTicket,
} from './live-game-security';
import {
  applyHostCommand,
  createLiveGameRuntime,
  joinLiveGame,
  LiveGameRuntimeError,
  type LiveGameRuntimeState,
  projectLiveGameSnapshot,
  type RuntimeActor,
  reconcileLiveGameDeadline,
  submitLiveGameAnswer,
  terminateForMissingHost,
  trustedLiveGameProfile,
} from './runtime-engine';
import {
  type LiveGameServerMessage,
  liveGameClientMessageSchema,
  roomInitializationSchema,
} from './runtime-protocol';
import {
  emptyTimers,
  initializeRoom,
  loadRoomState,
  persistFinalization,
  persistMutation,
  persistTimers,
  type StoredFinalization,
  type StoredTimers,
} from './runtime-storage';

type ConnectionData = RuntimeActor & { synced: boolean };

const HOST_GRACE_MS = 30_000;
const CLEANUP_DELAY_MS = 24 * 60 * 60 * 1_000;

function envString(env: Record<string, unknown>, name: string) {
  const value = env[name];
  if (typeof value !== 'string' || !value)
    throw new Error(`${name} is required.`);
  return value;
}

export default class LiveGameParty implements Party.Server {
  readonly options = { hibernate: false };
  private finalization: StoredFinalization | null = null;
  private initialized = false;
  private mutation = Promise.resolve();
  private state: LiveGameRuntimeState | null = null;
  private timers: StoredTimers = emptyTimers();

  constructor(readonly room: Party.Room) {}

  static async onBeforeConnect(request: Party.Request, lobby: Party.Lobby) {
    try {
      const token = new URL(request.url).searchParams.get('token');
      if (!token)
        return new Response('A connection ticket is required.', {
          status: 401,
        });
      const claims = await verifyLiveGameTicket(
        token,
        envString(lobby.env, 'LIVE_GAME_TICKET_SECRET')
      );
      if (claims.sessionId !== lobby.id) {
        return new Response('The ticket is for another room.', { status: 403 });
      }
      if (
        (claims.identityKind === 'GUEST' &&
          (claims.audience !== 'PARTICIPANT' ||
            !claims.guestDisplayName ||
            claims.role !== null)) ||
        (claims.identityKind === 'USER' && claims.guestDisplayName)
      ) {
        return new Response('The connection ticket is invalid.', {
          status: 401,
        });
      }
      const headers = new globalThis.Headers([...request.headers.entries()]);
      headers.set('X-Eduflow-Audience', claims.audience);
      headers.set('X-Eduflow-Identity-Kind', claims.identityKind);
      headers.set('X-Eduflow-Guest-Name', claims.guestDisplayName ?? '');
      headers.set('X-Eduflow-Role', claims.role ?? '');
      headers.set('X-Eduflow-User-Id', claims.sub);
      return new globalThis.Request(request.url, {
        headers,
      }) as unknown as Party.Request;
    } catch {
      return new Response('The connection ticket is invalid.', { status: 401 });
    }
  }

  async onStart() {
    const stored = await loadRoomState(this.room.storage);
    if (!stored) return;
    this.initialized = true;
    this.state = stored.state;
    this.timers = stored.timers;
    this.finalization = stored.finalization;
    this.updateRoundTimer();
    if (this.finalization && !this.finalization.committed) {
      this.timers.finalizationRetryAt = Date.now();
    }
    if (this.state.session.endedAt && !this.finalization) {
      await this.beginFinalization();
      return;
    }
    await persistTimers(this.room.storage, this.timers);
    await this.scheduleAlarm();
  }

  onConnect(
    connection: Party.Connection<ConnectionData>,
    context: Party.ConnectionContext
  ) {
    const audience = context.request.headers.get('X-Eduflow-Audience');
    const userId = context.request.headers.get('X-Eduflow-User-Id');
    if ((audience !== 'HOST' && audience !== 'PARTICIPANT') || !userId) {
      connection.close(1008, 'Authentication failed.');
      return;
    }
    connection.setState({
      audience,
      guestDisplayName:
        context.request.headers.get('X-Eduflow-Guest-Name') || undefined,
      identityKind:
        context.request.headers.get('X-Eduflow-Identity-Kind') === 'GUEST'
          ? 'GUEST'
          : 'USER',
      role: context.request.headers.get('X-Eduflow-Role') || null,
      synced: false,
      userId,
    });
    if (audience === 'HOST') void this.cancelHostDisconnect();
  }

  onMessage(
    message: string | ArrayBuffer | ArrayBufferView,
    sender: Party.Connection<ConnectionData>
  ) {
    const text =
      typeof message === 'string' ? message : new TextDecoder().decode(message);
    this.mutation = this.mutation.then(() => this.handleMessage(text, sender));
    return this.mutation;
  }

  async onClose(connection: Party.Connection<ConnectionData>) {
    const data = connection.state;
    if (!data) return;
    if (data.audience === 'HOST' && !this.hostConnected()) {
      if (this.state?.session.endedAt) {
        if (this.finalization) {
          this.timers.finalizationRetryAt = Date.now();
          await this.attemptFinalization();
        } else {
          await this.beginFinalization();
        }
        return;
      }
      this.timers.hostDisconnectAt = Date.now() + HOST_GRACE_MS;
      await persistTimers(this.room.storage, this.timers);
      await this.scheduleAlarm();
    }
    await this.broadcastSnapshots();
  }

  async onRequest(request: Party.Request) {
    if (request.method !== 'POST')
      return new Response('Method not allowed.', { status: 405 });
    const body = await request.text();
    const direction = request.headers.get('X-Eduflow-Direction');
    const valid =
      direction === 'next-to-partykit' &&
      (await verifyLiveGameServiceRequest({
        body,
        direction: 'next-to-partykit',
        method: request.method,
        pathname: new URL(request.url).pathname,
        requestId: request.headers.get('X-Eduflow-Request-Id'),
        secret: envString(this.room.env, 'LIVE_GAME_S2S_SECRET'),
        signature: request.headers.get('X-Eduflow-Signature'),
        timestamp: request.headers.get('X-Eduflow-Timestamp'),
      }));
    if (!valid)
      return new Response('Invalid service signature.', { status: 401 });

    const parsed = roomInitializationSchema.safeParse(JSON.parse(body));
    if (!parsed.success || parsed.data.session.id !== this.room.id) {
      return Response.json({ code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    const computedHash = await sha256Hex(
      JSON.stringify({
        rounds: parsed.data.rounds,
        session: parsed.data.session,
      })
    );
    if (computedHash !== parsed.data.payloadHash) {
      return Response.json({ code: 'PAYLOAD_HASH_MISMATCH' }, { status: 400 });
    }
    const stored = await loadRoomState(this.room.storage);
    if (stored) {
      if (
        stored.initialization.initializationKey !==
          parsed.data.initializationKey ||
        stored.initialization.payloadHash !== parsed.data.payloadHash
      ) {
        return Response.json(
          { code: 'INITIALIZATION_CONFLICT' },
          { status: 409 }
        );
      }
      this.initialized = true;
      this.state = stored.state;
      this.timers = stored.timers;
      this.finalization = stored.finalization;
      return Response.json({
        initialized: true,
        stateVersion: stored.state.session.stateVersion,
      });
    }

    await initializeRoom(this.room.storage, parsed.data);
    this.state = createLiveGameRuntime(parsed.data);
    this.timers = emptyTimers();
    this.initialized = true;
    return Response.json(
      { initialized: true, stateVersion: this.state.session.stateVersion },
      { status: 201 }
    );
  }

  async onAlarm() {
    if (!this.state) return;
    const now = Date.now();
    let changed = false;
    if (this.timers.roundDeadlineAt && this.timers.roundDeadlineAt <= now) {
      this.timers.roundDeadlineAt = null;
      changed = reconcileLiveGameDeadline(this.state, new Date(now));
      if (changed)
        await persistMutation(this.room.storage, this.state, {
          roundIds: [
            this.state.rounds[this.state.session.currentRoundIndex ?? 0]?.id,
          ].filter(Boolean) as string[],
        });
    }
    if (this.timers.hostDisconnectAt && this.timers.hostDisconnectAt <= now) {
      this.timers.hostDisconnectAt = null;
      if (!this.hostConnected())
        changed = terminateForMissingHost(this.state, new Date(now)) || changed;
      if (changed) await persistMutation(this.room.storage, this.state);
    }
    if (this.state.session.endedAt && !this.finalization)
      await this.beginFinalization();
    if (!this.state) return;
    if (
      this.finalization &&
      !this.finalization.committed &&
      (!this.timers.finalizationRetryAt ||
        this.timers.finalizationRetryAt <= now)
    ) {
      await this.attemptFinalization();
    }
    if (
      this.timers.cleanupAt &&
      this.timers.cleanupAt <= now &&
      this.finalization?.committed
    ) {
      await this.room.storage.deleteAll();
      this.state = null;
      this.initialized = false;
      return;
    }
    await persistTimers(this.room.storage, this.timers);
    await this.scheduleAlarm();
    if (changed) await this.broadcastSnapshots();
  }

  private async handleMessage(
    text: string,
    sender: Party.Connection<ConnectionData>
  ) {
    let requestId: string | undefined;
    try {
      if (!this.initialized || !this.state)
        throw new LiveGameRuntimeError(
          'ROOM_NOT_READY',
          'The game room is not initialized.',
          true
        );
      const parsed = liveGameClientMessageSchema.parse(JSON.parse(text));
      requestId = parsed.requestId;
      const actor = sender.state;
      if (!actor) throw new Error('Connection authentication is missing.');

      if (parsed.type === 'session.sync') {
        const profile = trustedLiveGameProfile(actor, parsed);
        const participant = joinLiveGame(
          this.state,
          actor,
          profile,
          new Date()
        );
        sender.setState({ ...actor, synced: true });
        if (participant)
          await persistMutation(this.room.storage, this.state, { participant });
        await this.broadcastSnapshots();
      } else if (parsed.type === 'host.command') {
        const previousRoundId =
          this.state.rounds[this.state.session.currentRoundIndex ?? 0]?.id;
        const result = applyHostCommand(this.state, actor, parsed, new Date());
        const currentRoundId =
          this.state.rounds[this.state.session.currentRoundIndex ?? 0]?.id;
        await persistMutation(this.room.storage, this.state, {
          roundIds: [previousRoundId, currentRoundId].filter(
            Boolean
          ) as string[],
        });
        this.updateRoundTimer();
        await persistTimers(this.room.storage, this.timers);
        sender.send(
          JSON.stringify({
            type: 'operation.result',
            requestId,
            stateVersion: this.state.session.stateVersion,
          })
        );
        await this.broadcastSnapshots();
        if (result.terminal) await this.beginFinalization();
      } else {
        const result = submitLiveGameAnswer(
          this.state,
          actor,
          parsed,
          new Date()
        );
        const participant = this.state.participants.find(
          (item) => item.id === result.answer.participantId
        );
        if (!result.idempotent)
          await persistMutation(this.room.storage, this.state, {
            answer: result.answer,
            participant,
            roundIds: result.revealed ? [result.answer.roundId] : [],
          });
        if (result.revealed) this.timers.roundDeadlineAt = null;
        sender.send(
          JSON.stringify({
            type: 'operation.result',
            requestId,
            stateVersion: this.state.session.stateVersion,
          })
        );
        await this.broadcastSnapshots();
      }
      await this.scheduleAlarm();
    } catch (error) {
      const runtimeError = error instanceof LiveGameRuntimeError ? error : null;
      sender.send(
        JSON.stringify({
          type: 'error',
          code: runtimeError?.code ?? 'INVALID_MESSAGE',
          message:
            runtimeError?.message ?? 'The message could not be processed.',
          requestId,
          retryable: runtimeError?.retryable ?? false,
          stateVersion: this.state?.session.stateVersion,
        })
      );
    }
  }

  private onlineUserIds() {
    return new Set(
      [...this.room.getConnections<ConnectionData>()]
        .map((connection) => connection.state?.userId)
        .filter((value): value is string => Boolean(value))
    );
  }

  private async broadcastSnapshots() {
    if (!this.state) return;
    const online = this.onlineUserIds();
    for (const connection of this.room.getConnections<ConnectionData>()) {
      if (!connection.state?.synced) continue;
      try {
        connection.send(
          JSON.stringify({
            type: 'session.snapshot',
            snapshot: projectLiveGameSnapshot(
              this.state,
              connection.state,
              online
            ),
          })
        );
      } catch (error) {
        if (!(error instanceof LiveGameRuntimeError)) throw error;
      }
    }
  }

  private hostConnected() {
    return [...this.room.getConnections<ConnectionData>()].some(
      (connection) => connection.state?.audience === 'HOST'
    );
  }

  private async cancelHostDisconnect() {
    if (!this.timers.hostDisconnectAt) return;
    this.timers.hostDisconnectAt = null;
    await persistTimers(this.room.storage, this.timers);
    await this.scheduleAlarm();
  }

  private updateRoundTimer() {
    if (this.state?.session.phase !== 'QUESTION_OPEN') {
      this.timers.roundDeadlineAt = null;
      return;
    }
    const round = this.state.rounds[this.state.session.currentRoundIndex ?? 0];
    this.timers.roundDeadlineAt = round?.deadlineAt
      ? new Date(round.deadlineAt).getTime()
      : null;
  }

  private async beginFinalization() {
    if (!this.state || this.finalization) return;
    this.finalization = await createFinalization(this.state);
    await persistFinalization(this.room.storage, this.finalization);
    this.room.broadcast(
      JSON.stringify({
        type: 'session.finalizing',
      } satisfies LiveGameServerMessage)
    );
    await this.attemptFinalization();
  }

  private async attemptFinalization() {
    if (!this.state || !this.finalization || this.finalization.committed)
      return;
    try {
      await deliverFinalization(this.room, this.state, this.finalization);
      this.finalization.committed = true;
      this.timers.finalizationRetryAt = null;
      this.timers.cleanupAt = Date.now() + CLEANUP_DELAY_MS;
      await persistFinalization(this.room.storage, this.finalization);
      this.room.broadcast(
        JSON.stringify({
          type: 'session.finalized',
        } satisfies LiveGameServerMessage)
      );
    } catch {
      this.finalization.attempts += 1;
      this.timers.finalizationRetryAt =
        Date.now() +
        Math.min(60_000, 1_000 * 2 ** Math.min(this.finalization.attempts, 6));
      await persistFinalization(this.room.storage, this.finalization);
    }
    await persistTimers(this.room.storage, this.timers);
    await this.scheduleAlarm();
  }

  private async scheduleAlarm() {
    const next = [
      this.timers.cleanupAt,
      this.timers.finalizationRetryAt,
      this.timers.hostDisconnectAt,
      this.timers.roundDeadlineAt,
    ]
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b)[0];
    if (next) await this.room.storage.setAlarm(next);
    else await this.room.storage.deleteAlarm();
  }
}

LiveGameParty satisfies Party.Worker;
