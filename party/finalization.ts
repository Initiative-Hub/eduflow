import type * as Party from 'partykit/server';
import { sha256Hex, signLiveGameServiceRequest } from './live-game-security';
import type { LiveGameRuntimeState } from './runtime-engine';
import type { LiveGameFinalization } from './runtime-protocol';
import type { StoredFinalization } from './runtime-storage';

const CALLBACK_PATH = '/api/v1/internal/live-game/finalize';
const MAX_BODY_BYTES = 256 * 1024;
const TARGET_ITEMS_BYTES = 240 * 1024;

function requiredEnv(room: Party.Room, name: string) {
  const value = room.env[name];
  if (typeof value !== 'string' || !value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function splitItems<T>(items: T[]) {
  const chunks: T[][] = [];
  let chunk: T[] = [];
  let size = 2;
  for (const item of items) {
    const itemSize =
      new TextEncoder().encode(JSON.stringify(item)).byteLength + 1;
    if (chunk.length > 0 && size + itemSize > TARGET_ITEMS_BYTES) {
      chunks.push(chunk);
      chunk = [];
      size = 2;
    }
    chunk.push(item);
    size += itemSize;
  }
  if (chunk.length > 0) chunks.push(chunk);
  return chunks;
}

async function createMessages(
  state: LiveGameRuntimeState,
  finalization: StoredFinalization
): Promise<LiveGameFinalization[]> {
  const participants = state.participants.map(
    ({ id, userId, guestId, displayName, joinedAt }) => ({
      id,
      userId,
      ...(guestId ? { guestId } : {}),
      displayName,
      joinedAt,
    })
  );
  const answers = state.answers.map(
    ({
      id,
      participantId,
      roundId,
      selectedOptionId,
      idempotencyKey,
      submittedAt,
      responseTimeMs,
    }) => ({
      id,
      participantId,
      roundId,
      selectedOptionId,
      idempotencyKey,
      submittedAt,
      responseTimeMs,
    })
  );
  const participantChunks = splitItems(participants);
  const answerChunks = splitItems(answers);
  const begin: LiveGameFinalization = {
    type: 'BEGIN',
    sessionId: state.session.id,
    finalizationId: finalization.finalizationId,
    stateHash: finalization.stateHash,
    expectedParticipantCount: participants.length,
    expectedAnswerCount: answers.length,
    terminal: {
      phase: 'FINAL_CELEBRATION',
      closeReason: state.session.closedReason ?? 'COMPLETED',
      currentRoundIndex: state.session.currentRoundIndex,
      endedAt: state.session.endedAt ?? new Date().toISOString(),
      startedAt: state.session.startedAt,
      stateVersion: state.session.stateVersion,
      rounds: state.rounds.map(({ id, openedAt, deadlineAt, revealedAt }) => ({
        id,
        openedAt,
        deadlineAt,
        revealedAt,
      })),
    },
  };

  const messages: LiveGameFinalization[] = [begin];
  for (const [chunkIndex, items] of participantChunks.entries()) {
    messages.push({
      type: 'PARTICIPANTS',
      sessionId: state.session.id,
      finalizationId: finalization.finalizationId,
      chunkIndex,
      payloadHash: await sha256Hex(JSON.stringify(items)),
      items,
    });
  }
  for (const [chunkIndex, items] of answerChunks.entries()) {
    messages.push({
      type: 'ANSWERS',
      sessionId: state.session.id,
      finalizationId: finalization.finalizationId,
      chunkIndex,
      payloadHash: await sha256Hex(JSON.stringify(items)),
      items,
    });
  }
  messages.push({
    type: 'COMMIT',
    sessionId: state.session.id,
    finalizationId: finalization.finalizationId,
    stateHash: finalization.stateHash,
  });
  return messages;
}

export async function createFinalization(
  state: LiveGameRuntimeState
): Promise<StoredFinalization> {
  return {
    attempts: 0,
    committed: false,
    finalizationId: crypto.randomUUID(),
    stateHash: await sha256Hex(JSON.stringify(state)),
  };
}

export async function deliverFinalization(
  room: Party.Room,
  state: LiveGameRuntimeState,
  finalization: StoredFinalization
) {
  const baseUrl = requiredEnv(room, 'NEXT_APP_URL').replace(/\/$/, '');
  const secret = requiredEnv(room, 'LIVE_GAME_S2S_SECRET');

  for (const message of await createMessages(state, finalization)) {
    const body = JSON.stringify(message);
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
      throw new Error('A finalization chunk exceeded 256 KiB.');
    }
    const headers = await signLiveGameServiceRequest({
      body,
      direction: 'partykit-to-next',
      method: 'POST',
      pathname: CALLBACK_PATH,
      secret,
    });
    const response = await fetch(`${baseUrl}${CALLBACK_PATH}`, {
      body,
      headers,
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(
        `Finalization ${message.type} failed with ${response.status}.`
      );
    }
  }
}
