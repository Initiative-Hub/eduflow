import type * as Party from 'partykit/server';
import type { LiveGameRuntimeState } from '../src/lib/game-quiz/runtime-engine';
import type {
  RoomInitialization,
  RuntimeAnswer,
  RuntimeParticipant,
  RuntimeRound,
  RuntimeSession,
} from '../src/lib/game-quiz/runtime-protocol';

export type StoredRoomMetadata = {
  initializationKey: string;
  payloadHash: string;
  session: RuntimeSession;
};

export type StoredTimers = {
  cleanupAt: number | null;
  finalizationRetryAt: number | null;
  hostDisconnectAt: number | null;
  roundDeadlineAt: number | null;
};

export type StoredFinalization = {
  attempts: number;
  committed: boolean;
  finalizationId: string;
  stateHash: string;
};

const keys = {
  answer: (id: string) => `answer:${id}`,
  finalization: 'finalization',
  idempotency: (participantId: string, key: string) =>
    `idempotency:${participantId}:${key}`,
  metadata: 'metadata',
  participant: (id: string) => `participant:${id}`,
  round: (id: string) => `round:${id}`,
  timers: 'timers',
};

export const emptyTimers = (): StoredTimers => ({
  cleanupAt: null,
  finalizationRetryAt: null,
  hostDisconnectAt: null,
  roundDeadlineAt: null,
});

export async function loadRoomState(storage: Party.Storage) {
  const metadata = await storage.get<StoredRoomMetadata>(keys.metadata);
  if (!metadata) return null;

  const [rounds, participants, answers, timers, finalization] =
    await Promise.all([
      storage.list<RuntimeRound>({ prefix: 'round:' }),
      storage.list<RuntimeParticipant>({ prefix: 'participant:' }),
      storage.list<RuntimeAnswer>({ prefix: 'answer:' }),
      storage.get<StoredTimers>(keys.timers),
      storage.get<StoredFinalization>(keys.finalization),
    ]);

  return {
    finalization: finalization ?? null,
    initialization: {
      initializationKey: metadata.initializationKey,
      payloadHash: metadata.payloadHash,
    },
    state: {
      answers: [...answers.values()],
      participants: [...participants.values()],
      rounds: [...rounds.values()].sort(
        (left, right) => left.orderIndex - right.orderIndex
      ),
      session: metadata.session,
    } satisfies LiveGameRuntimeState,
    timers: timers ?? emptyTimers(),
  };
}

export async function initializeRoom(
  storage: Party.Storage,
  initialization: RoomInitialization
) {
  const values: Record<string, unknown> = {
    [keys.metadata]: {
      initializationKey: initialization.initializationKey,
      payloadHash: initialization.payloadHash,
      session: initialization.session,
    } satisfies StoredRoomMetadata,
    [keys.timers]: emptyTimers(),
  };
  for (const round of initialization.rounds)
    values[keys.round(round.id)] = round;
  await storage.put(values);
}

export async function persistMutation(
  storage: Party.Storage,
  state: LiveGameRuntimeState,
  input: {
    answer?: RuntimeAnswer;
    participant?: RuntimeParticipant;
    roundIds?: string[];
  } = {}
) {
  const metadata = await storage.get<StoredRoomMetadata>(keys.metadata);
  if (!metadata) throw new Error('Room metadata is missing.');

  const values: Record<string, unknown> = {
    [keys.metadata]: { ...metadata, session: state.session },
  };
  if (input.participant) {
    values[keys.participant(input.participant.id)] = input.participant;
  }
  if (input.answer) {
    values[keys.answer(input.answer.id)] = input.answer;
    values[
      keys.idempotency(input.answer.participantId, input.answer.idempotencyKey)
    ] = input.answer.id;
  }
  for (const roundId of input.roundIds ?? []) {
    const round = state.rounds.find((candidate) => candidate.id === roundId);
    if (round) values[keys.round(round.id)] = round;
  }
  await storage.put(values);
}

export const persistTimers = (storage: Party.Storage, timers: StoredTimers) =>
  storage.put(keys.timers, timers);

export const persistFinalization = (
  storage: Party.Storage,
  finalization: StoredFinalization
) => storage.put(keys.finalization, finalization);
