import type {
  GameActor,
  GameAnswerRecord,
  GameParticipantRecord,
  GameQuizWithQuestions,
  GameRoundRecord,
  SessionWithGameData,
} from './types';
import {
  createAvatarReadSignedUrl,
  isAbsoluteHttpUrl,
  isAvatarObjectKey,
} from '@/lib/storage/avatar';

const canManage = (actor: GameActor, ownerId: string) =>
  actor.role === 'ADMIN' || actor.userId === ownerId;

const isRevealVisible = (phase: SessionWithGameData['phase']) =>
  phase === 'REVEAL' ||
  phase === 'SCOREBOARD' ||
  phase === 'FINAL_CELEBRATION' ||
  phase === 'REPORT';

const projectOption = (
  option: GameRoundRecord['options'][number],
  includeCorrectness: boolean,
  answerCount?: number
) => ({
  id: option.id,
  orderIndex: option.orderIndex,
  text: option.text,
  ...(includeCorrectness ? { isCorrect: option.isCorrect } : {}),
  ...(answerCount === undefined ? {} : { answerCount }),
});

const projectRound = (
  round: GameRoundRecord,
  includeCorrectness: boolean,
  includeExplanation: boolean,
  answers?: GameAnswerRecord[]
) => ({
  id: round.id,
  orderIndex: round.orderIndex,
  prompt: round.prompt,
  hint: round.hint,
  ...(includeExplanation ? { explanation: round.explanation } : {}),
  timerSeconds: round.timerSeconds,
  maxPoints: round.maxPoints,
  openedAt: round.openedAt,
  deadlineAt: round.deadlineAt,
  revealedAt: round.revealedAt,
  options: round.options.map((option) => {
    const answerCount = answers?.filter(
      (answer) => answer.selectedOptionId === option.id
    ).length;
    return projectOption(option, includeCorrectness, answerCount);
  }),
});

export function projectGameQuizDefinition(quiz: GameQuizWithQuestions) {
  return {
    id: quiz.id,
    title: quiz.title,
    topic: quiz.topic,
    difficulty: quiz.difficulty,
    templateKey: quiz.templateKey,
    randomizeQuestionOrder: quiz.randomizeQuestionOrder,
    randomizeAnswerOrder: quiz.randomizeAnswerOrder,
    revision: quiz.revision,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
    questions: quiz.questions.map((question) => ({
      id: question.id,
      orderIndex: question.orderIndex,
      prompt: question.prompt,
      hint: question.hint,
      explanation: question.explanation,
      timerSeconds: question.timerSeconds,
      maxPoints: question.maxPoints,
      options: question.options.map((option) => ({
        id: option.id,
        orderIndex: option.orderIndex,
        text: option.text,
        isCorrect: option.isCorrect,
      })),
    })),
  };
}

async function projectParticipant(participant: GameParticipantRecord) {
  const storedImage = participant.user?.image ?? null;
  let image = storedImage;

  if (
    storedImage &&
    !isAbsoluteHttpUrl(storedImage) &&
    isAvatarObjectKey(storedImage)
  ) {
    try {
      image = await createAvatarReadSignedUrl({ objectKey: storedImage });
    } catch (error) {
      console.error('Failed to sign Game Quiz participant avatar.', error);
      image = null;
    }
  }

  return {
    id: participant.id,
    realtimeKey: participant.realtimeKey,
    displayName: participant.displayName,
    image,
    score: participant.score,
    joinedAt: participant.joinedAt,
    lastSeenAt: participant.lastSeenAt,
  };
}

function projectPlayerAnswer(
  answer: GameAnswerRecord | undefined,
  revealed: boolean
) {
  if (!answer) {
    return null;
  }

  return {
    roundId: answer.roundId,
    selectedOptionId: answer.selectedOptionId,
    submittedAt: answer.submittedAt,
    ...(revealed
      ? { isCorrect: answer.isCorrect, pointsAwarded: answer.pointsAwarded }
      : {}),
  };
}

async function projectLeaderboard(session: SessionWithGameData) {
  const participants = await Promise.all(
    session.participants.map(projectParticipant)
  );
  return participants.map((participant, index) => ({
    rank: index + 1,
    ...participant,
  }));
}

export async function projectParticipantSession(
  session: SessionWithGameData,
  participant: GameParticipantRecord
) {
  const revealed = isRevealVisible(session.phase);
  const currentRound =
    session.currentRoundIndex === null
      ? null
      : (session.rounds.find(
          (round) => round.orderIndex === session.currentRoundIndex
        ) ?? null);
  const answer = currentRound
    ? session.answers.find(
        (candidate) =>
          candidate.participantId === participant.id &&
          candidate.roundId === currentRound.id
      )
    : undefined;

  return {
    gameQuizId: session.gameQuizId,
    realtimeKey: session.realtimeKey,
    title: session.title,
    topic: session.topic,
    difficulty: session.difficulty,
    templateKey: session.templateKey,
    phase: session.phase,
    currentRoundIndex: session.currentRoundIndex,
    totalRounds: session.rounds.length,
    joiningLocked: session.joiningLocked,
    stateVersion: session.stateVersion,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    closedReason: session.closedReason,
    participant: await projectParticipant(participant),
    currentRound: currentRound
      ? projectRound(
          currentRound,
          revealed,
          revealed,
          revealed
            ? session.answers.filter(
                (answer) => answer.roundId === currentRound.id
              )
            : undefined
        )
      : null,
    answer: projectPlayerAnswer(answer, revealed),
    leaderboard: revealed ? await projectLeaderboard(session) : null,
  };
}

export async function projectHostSession(session: SessionWithGameData) {
  const currentRound =
    session.currentRoundIndex === null
      ? null
      : (session.rounds.find(
          (round) => round.orderIndex === session.currentRoundIndex
        ) ?? null);

  return {
    gameQuizId: session.gameQuizId,
    realtimeKey: session.realtimeKey,
    title: session.title,
    topic: session.topic,
    difficulty: session.difficulty,
    joinCode: session.joinCode,
    templateKey: session.templateKey,
    phase: session.phase,
    currentRoundIndex: session.currentRoundIndex,
    totalRounds: session.rounds.length,
    joiningLocked: session.joiningLocked,
    stateVersion: session.stateVersion,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    closedReason: session.closedReason,
    participants: await Promise.all(
      session.participants.map(projectParticipant)
    ),
    currentRound: currentRound
      ? projectRound(
          currentRound,
          true,
          true,
          session.answers.filter((answer) => answer.roundId === currentRound.id)
        )
      : null,
    rounds: session.rounds.map((round) => projectRound(round, true, true)),
    leaderboard: await projectLeaderboard(session),
  };
}

export async function projectSessionForActor(
  session: SessionWithGameData,
  actor: GameActor
) {
  if (canManage(actor, session.hostId)) {
    return {
      audience: 'HOST' as const,
      session: await projectHostSession(session),
    };
  }

  const participant = session.participants.find(
    (candidate) => candidate.userId === actor.userId
  );
  if (!participant) {
    return null;
  }

  return {
    audience: 'PARTICIPANT' as const,
    session: await projectParticipantSession(session, participant),
  };
}
