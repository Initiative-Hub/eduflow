import type {
  GameParticipant,
  GameQuizQuestion,
  GameSessionPhase,
  GameSessionSnapshot,
} from '../types';

export type PreviewParticipantRank = 1 | 4;

const SAMPLE_PARTICIPANTS: GameParticipant[] = [
  {
    id: 'preview-alex',
    displayName: 'Alex Mercer',
    image: null,
    score: 2200,
  },
  {
    id: 'preview-jordan',
    displayName: 'Jordan Lee',
    image: null,
    score: 1900,
  },
  {
    id: 'preview-taylor',
    displayName: 'Taylor Smith',
    image: null,
    score: 1600,
  },
  {
    id: 'preview-morgan',
    displayName: 'Morgan Chen',
    image: null,
    score: 900,
  },
  {
    id: 'preview-casey',
    displayName: 'Casey Nguyen',
    image: null,
    score: 500,
  },
];

export function createGameQuizPreviewSession({
  gameQuizId,
  gameTitle,
  participantName,
  participantRank,
  phase,
  question,
  questionIndex,
  selectedOptionId,
  totalRounds,
}: {
  gameQuizId: string;
  gameTitle: string;
  participantName: string;
  participantRank: PreviewParticipantRank;
  phase: Extract<GameSessionPhase, 'QUESTION_OPEN' | 'REVEAL' | 'SCOREBOARD'>;
  question: GameQuizQuestion;
  questionIndex: number;
  selectedOptionId?: string;
  totalRounds: number;
}): GameSessionSnapshot {
  const previewParticipant: GameParticipant = {
    id: 'preview-current-player',
    displayName: participantName,
    image: null,
    score: participantRank === 1 ? 2450 : 1250,
  };
  const participants = [previewParticipant, ...SAMPLE_PARTICIPANTS];
  const revealedOptionId =
    selectedOptionId ??
    (phase === 'REVEAL'
      ? question.options.find((option) => option.isCorrect)?.id
      : undefined);
  const answeredOption = question.options.find(
    (option) => option.id === revealedOptionId
  );
  const answerCount = phase === 'QUESTION_OPEN' ? 2 : participants.length;
  const currentRound = {
    ...question,
    deadlineAt:
      phase === 'QUESTION_OPEN'
        ? new Date(Date.now() + 20_000).toISOString()
        : null,
    options: question.options.map((option, index) => ({
      ...option,
      answerCount: [3, 1, 1, 1][index] ?? 0,
      answerers: participants
        .slice(index, index + (index === 0 ? 3 : 1))
        .map(({ displayName, id, image }) => ({ displayName, id, image })),
    })),
  };

  return {
    gameQuizId,
    realtimeKey: 'preview-realtime-key',
    gameTitle,
    joinCode: '123456',
    joiningLocked: true,
    phase,
    stateVersion: 1,
    currentRound,
    currentRoundIndex: questionIndex,
    totalRounds,
    participant: previewParticipant,
    participants,
    answerCount,
    leaderboard: participants,
    myAnswer: revealedOptionId
      ? {
          optionId: revealedOptionId,
          isCorrect: phase === 'REVEAL' ? answeredOption?.isCorrect : undefined,
          pointsAwarded:
            phase === 'REVEAL' && answeredOption?.isCorrect ? 850 : 0,
        }
      : null,
  };
}
