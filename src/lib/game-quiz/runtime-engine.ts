import type {
  LiveGameAudience,
  LiveGameSnapshot,
  RoomInitialization,
  RuntimeAnswer,
  RuntimeParticipant,
  RuntimeRound,
  RuntimeSession,
} from './runtime-protocol';
import { calculateGamePoints } from './scoring';

export type LiveGameRuntimeState = {
  session: RuntimeSession;
  rounds: RuntimeRound[];
  participants: RuntimeParticipant[];
  answers: RuntimeAnswer[];
};

export type RuntimeActor = {
  audience: LiveGameAudience;
  userId: string;
  role: string | null;
  identityKind?: 'USER' | 'GUEST';
  guestDisplayName?: string;
};

export class LiveGameRuntimeError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable = false
  ) {
    super(message);
    this.name = 'LiveGameRuntimeError';
  }
}

export function createLiveGameRuntime(
  initialization: RoomInitialization
): LiveGameRuntimeState {
  return {
    session: structuredClone(initialization.session),
    rounds: structuredClone(initialization.rounds),
    participants: [],
    answers: [],
  };
}

function currentRound(state: LiveGameRuntimeState) {
  const index = state.session.currentRoundIndex;
  return index === null
    ? null
    : (state.rounds.find((round) => round.orderIndex === index) ?? null);
}

function requireOpen(state: LiveGameRuntimeState) {
  if (state.session.endedAt) {
    throw new LiveGameRuntimeError(
      'GAME_SESSION_ENDED',
      'This Game Session has ended.'
    );
  }
}

function requirePhase(
  state: LiveGameRuntimeState,
  phases: RuntimeSession['phase'][]
) {
  if (!phases.includes(state.session.phase)) {
    throw new LiveGameRuntimeError(
      'INVALID_SESSION_PHASE',
      `This action is unavailable while the session is ${state.session.phase}.`
    );
  }
}

function requireHost(state: LiveGameRuntimeState, actor: RuntimeActor) {
  if (
    actor.audience !== 'HOST' ||
    actor.identityKind === 'GUEST' ||
    (actor.userId !== state.session.hostId && actor.role !== 'ADMIN')
  ) {
    throw new LiveGameRuntimeError(
      'FORBIDDEN',
      'Only the Game Session host can control this session.'
    );
  }
}

function participantForActor(state: LiveGameRuntimeState, actor: RuntimeActor) {
  return state.participants.find((participant) =>
    actor.identityKind === 'GUEST'
      ? participant.guestId === actor.userId
      : participant.userId === actor.userId
  );
}

function openRound(round: RuntimeRound, now: Date) {
  round.openedAt = now.toISOString();
  round.deadlineAt = new Date(
    now.getTime() + round.timerSeconds * 1_000
  ).toISOString();
  round.revealedAt = null;
}

function revealRound(
  state: LiveGameRuntimeState,
  round: RuntimeRound,
  now: Date
) {
  round.revealedAt = now.toISOString();
  state.session.phase = 'REVEAL';
  state.session.stateVersion += 1;
}

function finish(
  state: LiveGameRuntimeState,
  reason: 'COMPLETED' | 'HOST_ENDED' | 'HOST_LEFT',
  now: Date
) {
  if (state.session.endedAt) return false;
  state.session.phase = 'FINAL_CELEBRATION';
  state.session.joiningLocked = true;
  state.session.endedAt = now.toISOString();
  state.session.closedReason = reason;
  state.session.stateVersion += 1;
  return true;
}

export function trustedLiveGameProfile(
  actor: RuntimeActor,
  profile: { displayName: string; image: string | null }
) {
  if (actor.identityKind !== 'GUEST') return profile;
  if (!actor.guestDisplayName) {
    throw new LiveGameRuntimeError(
      'INVALID_GUEST_PROFILE',
      'The guest connection has no signed name.'
    );
  }
  return { displayName: actor.guestDisplayName, image: null };
}

export function joinLiveGame(
  state: LiveGameRuntimeState,
  actor: RuntimeActor,
  profile: { displayName: string; image: string | null },
  now = new Date()
) {
  if (actor.audience !== 'PARTICIPANT') {
    return null;
  }
  const existing = participantForActor(state, actor);
  if (existing) {
    existing.lastSeenAt = now.toISOString();
    existing.displayName = profile.displayName;
    existing.image = profile.image;
    return existing;
  }
  requireOpen(state);
  if (state.session.joiningLocked) {
    throw new LiveGameRuntimeError(
      'JOINING_LOCKED',
      'The host has locked joining for this Game Session.'
    );
  }
  const participant: RuntimeParticipant = {
    id: crypto.randomUUID(),
    userId: actor.identityKind === 'GUEST' ? null : actor.userId,
    guestId: actor.identityKind === 'GUEST' ? actor.userId : null,
    displayName: profile.displayName,
    image: profile.image,
    score: 0,
    joinedAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
  };
  state.participants.push(participant);
  return participant;
}

export function applyHostCommand(
  state: LiveGameRuntimeState,
  actor: RuntimeActor,
  command: {
    action: 'START' | 'SKIP' | 'NEXT' | 'SET_JOINING_LOCKED' | 'END_GAME';
    expectedStateVersion: number;
    joiningLocked?: boolean;
  },
  now = new Date()
) {
  requireHost(state, actor);
  requireOpen(state);
  if (command.expectedStateVersion !== state.session.stateVersion) {
    throw new LiveGameRuntimeError(
      'STATE_CONFLICT',
      'The Game Session changed. Refresh before controlling it.',
      true
    );
  }

  const round = currentRound(state);
  switch (command.action) {
    case 'START': {
      requirePhase(state, ['LOBBY']);
      if (state.participants.length === 0) {
        throw new LiveGameRuntimeError(
          'GAME_SESSION_EMPTY',
          'At least one participant must join before the game starts.'
        );
      }
      const firstRound = state.rounds[0];
      if (!firstRound) {
        throw new LiveGameRuntimeError(
          'GAME_SESSION_EMPTY',
          'This Game Session has no rounds.'
        );
      }
      openRound(firstRound, now);
      state.session.phase = 'QUESTION_OPEN';
      state.session.currentRoundIndex = firstRound.orderIndex;
      state.session.startedAt = now.toISOString();
      state.session.stateVersion += 1;
      break;
    }
    case 'SKIP':
      requirePhase(state, ['QUESTION_OPEN']);
      if (!round) {
        throw new LiveGameRuntimeError(
          'GAME_ROUND_NOT_FOUND',
          'There is no active round to reveal.'
        );
      }
      revealRound(state, round, now);
      break;
    case 'NEXT': {
      if (state.session.phase === 'REVEAL') {
        state.session.phase = 'SCOREBOARD';
        state.session.stateVersion += 1;
        break;
      }
      requirePhase(state, ['SCOREBOARD']);
      const nextRound = state.rounds.find(
        (candidate) =>
          candidate.orderIndex === (state.session.currentRoundIndex ?? -1) + 1
      );
      if (!nextRound) {
        finish(state, 'COMPLETED', now);
        break;
      }
      openRound(nextRound, now);
      state.session.phase = 'QUESTION_OPEN';
      state.session.currentRoundIndex = nextRound.orderIndex;
      state.session.stateVersion += 1;
      break;
    }
    case 'SET_JOINING_LOCKED':
      requirePhase(state, ['LOBBY', 'QUESTION_OPEN', 'REVEAL', 'SCOREBOARD']);
      if (typeof command.joiningLocked !== 'boolean') {
        throw new LiveGameRuntimeError(
          'VALIDATION_ERROR',
          'Joining lock state is required.'
        );
      }
      state.session.joiningLocked = command.joiningLocked;
      state.session.stateVersion += 1;
      break;
    case 'END_GAME':
      requirePhase(state, ['QUESTION_OPEN', 'REVEAL', 'SCOREBOARD']);
      finish(state, 'HOST_ENDED', now);
      break;
  }

  return { terminal: Boolean(state.session.endedAt) };
}

export function submitLiveGameAnswer(
  state: LiveGameRuntimeState,
  actor: RuntimeActor,
  input: {
    roundId: string;
    selectedOptionId: string;
    idempotencyKey: string;
  },
  now = new Date()
) {
  if (actor.audience !== 'PARTICIPANT') {
    throw new LiveGameRuntimeError(
      'FORBIDDEN',
      'Only participants can submit answers.'
    );
  }
  const participant = participantForActor(state, actor);
  if (!participant) {
    throw new LiveGameRuntimeError(
      'GAME_PARTICIPANT_NOT_FOUND',
      'Join this Game Session before submitting an answer.'
    );
  }
  const existingByKey = state.answers.find(
    (answer) =>
      answer.participantId === participant.id &&
      answer.idempotencyKey === input.idempotencyKey
  );
  if (existingByKey) {
    if (existingByKey.roundId !== input.roundId) {
      throw new LiveGameRuntimeError(
        'IDEMPOTENCY_KEY_REUSED',
        'This idempotency key was already used for a different round.'
      );
    }
    return { answer: existingByKey, idempotent: true, revealed: false };
  }
  if (
    state.answers.some(
      (answer) =>
        answer.participantId === participant.id &&
        answer.roundId === input.roundId
    )
  ) {
    throw new LiveGameRuntimeError(
      'ANSWER_ALREADY_SUBMITTED',
      'An answer was already submitted for this round.'
    );
  }

  requireOpen(state);
  requirePhase(state, ['QUESTION_OPEN']);
  const round = currentRound(state);
  if (!round || round.id !== input.roundId) {
    throw new LiveGameRuntimeError(
      'ROUND_NOT_ACTIVE',
      'This round is not currently accepting answers.'
    );
  }
  if (
    !round.openedAt ||
    !round.deadlineAt ||
    now >= new Date(round.deadlineAt)
  ) {
    throw new LiveGameRuntimeError(
      'ROUND_CLOSED',
      'The answer deadline has passed.'
    );
  }
  const option = round.options.find(
    (candidate) => candidate.id === input.selectedOptionId
  );
  if (!option) {
    throw new LiveGameRuntimeError(
      'OPTION_NOT_FOUND',
      'The selected option does not belong to this round.'
    );
  }

  const responseTimeMs = now.getTime() - new Date(round.openedAt).getTime();
  const pointsAwarded = calculateGamePoints(
    round.maxPoints,
    responseTimeMs,
    round.timerSeconds,
    option.isCorrect
  );
  const answer: RuntimeAnswer = {
    id: crypto.randomUUID(),
    participantId: participant.id,
    roundId: round.id,
    selectedOptionId: option.id,
    idempotencyKey: input.idempotencyKey,
    submittedAt: now.toISOString(),
    responseTimeMs,
    isCorrect: option.isCorrect,
    pointsAwarded,
  };
  state.answers.push(answer);
  participant.score += pointsAwarded;
  participant.lastSeenAt = now.toISOString();

  const roundAnswerCount = state.answers.filter(
    (candidate) => candidate.roundId === round.id
  ).length;
  const revealed =
    state.participants.length > 0 &&
    roundAnswerCount >= state.participants.length;
  if (revealed) revealRound(state, round, now);
  return { answer, idempotent: false, revealed };
}

export function reconcileLiveGameDeadline(
  state: LiveGameRuntimeState,
  now = new Date()
) {
  const round = currentRound(state);
  if (
    state.session.phase !== 'QUESTION_OPEN' ||
    !round?.deadlineAt ||
    now < new Date(round.deadlineAt)
  ) {
    return false;
  }
  revealRound(state, round, now);
  return true;
}

export function terminateForMissingHost(
  state: LiveGameRuntimeState,
  now = new Date()
) {
  return finish(state, 'HOST_LEFT', now);
}

const revealVisible = (phase: RuntimeSession['phase']) =>
  phase === 'REVEAL' || phase === 'SCOREBOARD' || phase === 'FINAL_CELEBRATION';

export function projectLiveGameSnapshot(
  state: LiveGameRuntimeState,
  actor: RuntimeActor,
  onlineUserIds: ReadonlySet<string>
): LiveGameSnapshot {
  const host =
    actor.audience === 'HOST' &&
    actor.identityKind !== 'GUEST' &&
    (actor.userId === state.session.hostId || actor.role === 'ADMIN');
  const participant = participantForActor(state, actor);
  if (!host && !participant) {
    throw new LiveGameRuntimeError(
      'FORBIDDEN',
      'Join this Game Session before viewing it.'
    );
  }

  const revealed = revealVisible(state.session.phase);
  const round = currentRound(state);
  const roundAnswers = round
    ? state.answers.filter((answer) => answer.roundId === round.id)
    : [];
  const projectedParticipants = state.participants
    .toSorted(
      (left, right) =>
        right.score - left.score || left.joinedAt.localeCompare(right.joinedAt)
    )
    .map((candidate) => ({
      id: candidate.id,
      displayName: candidate.displayName,
      image: candidate.image,
      score: candidate.score,
      isOnline: onlineUserIds.has(candidate.guestId ?? candidate.userId ?? ''),
      joinedAt: candidate.joinedAt,
    }));
  const myAnswer =
    participant && round
      ? state.answers.find(
          (answer) =>
            answer.participantId === participant.id &&
            answer.roundId === round.id
        )
      : undefined;

  const currentRoundProjection = round
    ? {
        id: round.id,
        order: round.orderIndex,
        prompt: round.prompt,
        hint: round.hint,
        ...(host || revealed ? { explanation: round.explanation } : {}),
        timeLimitSeconds: round.timerSeconds,
        maxPoints: round.maxPoints,
        openedAt: round.openedAt,
        deadlineAt: round.deadlineAt,
        ...(host
          ? {
              statistics: {
                responseCount: roundAnswers.length,
                correctCount: roundAnswers.filter((answer) => answer.isCorrect)
                  .length,
                averageResponseTimeMs:
                  roundAnswers.length === 0
                    ? null
                    : Math.round(
                        roundAnswers.reduce(
                          (sum, answer) => sum + answer.responseTimeMs,
                          0
                        ) / roundAnswers.length
                      ),
              },
            }
          : {}),
        options: round.options.map((option) => {
          const optionAnswers = roundAnswers.filter(
            (answer) => answer.selectedOptionId === option.id
          );
          return {
            id: option.id,
            text: option.text,
            order: option.orderIndex,
            ...(host || revealed ? { isCorrect: option.isCorrect } : {}),
            ...(host ? { answerCount: optionAnswers.length } : {}),
            ...(host && state.session.phase === 'REVEAL'
              ? {
                  answerers: optionAnswers.flatMap((answer) => {
                    const answerer = state.participants.find(
                      (candidate) => candidate.id === answer.participantId
                    );
                    return answerer
                      ? [
                          {
                            id: answerer.id,
                            displayName: answerer.displayName,
                            image: answerer.image,
                          },
                        ]
                      : [];
                  }),
                }
              : {}),
          };
        }),
      }
    : null;

  return {
    gameQuizId: state.session.gameQuizId,
    gameTitle: state.session.title,
    joinCode: state.session.joinCode,
    joiningLocked: state.session.joiningLocked,
    phase: state.session.phase,
    closedReason: state.session.closedReason,
    endedAt: state.session.endedAt,
    stateVersion: state.session.stateVersion,
    currentRound: currentRoundProjection,
    currentRoundIndex: state.session.currentRoundIndex ?? 0,
    totalRounds: state.rounds.length,
    participant: participant
      ? (projectedParticipants.find((item) => item.id === participant.id) ??
        null)
      : null,
    participants: host ? projectedParticipants : [],
    answerCount: roundAnswers.length,
    leaderboard: host || revealed ? projectedParticipants : [],
    myAnswer: myAnswer
      ? {
          optionId: myAnswer.selectedOptionId,
          ...(revealed
            ? {
                isCorrect: myAnswer.isCorrect,
                pointsAwarded: myAnswer.pointsAwarded,
              }
            : {}),
        }
      : null,
  };
}
