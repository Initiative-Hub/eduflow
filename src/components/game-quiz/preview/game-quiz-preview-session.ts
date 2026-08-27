import type {
  GameParticipant,
  GameQuizQuestion,
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
  question,
  questionIndex,
  totalRounds,
}: {
  gameQuizId: string;
  gameTitle: string;
  participantName: string;
  participantRank: PreviewParticipantRank;
  question: GameQuizQuestion;
  questionIndex: number;
  totalRounds: number;
}): GameSessionSnapshot {
  const previewParticipant: GameParticipant = {
    id: 'preview-current-player',
    displayName: participantName,
    image: null,
    score: participantRank === 1 ? 2450 : 1250,
  };
  const participants = [previewParticipant, ...SAMPLE_PARTICIPANTS];

  return {
    gameQuizId,
    realtimeKey: 'preview-realtime-key',
    gameTitle,
    joinCode: '123456',
    joiningLocked: true,
    phase: 'SCOREBOARD',
    stateVersion: 1,
    currentRound: question,
    currentRoundIndex: questionIndex,
    totalRounds,
    participant: previewParticipant,
    participants,
    answerCount: participants.length,
    leaderboard: participants,
    myAnswer: null,
  };
}
