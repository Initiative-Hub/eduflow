import type { GameQuizTemplateKey } from '@/generated/prisma';

export const GAME_QUIZ_TEMPLATE_KEY: GameQuizTemplateKey = 'LIVE_QUIZ_RALLY';

export const GAME_SESSION_PHASES = [
  'LOBBY',
  'QUESTION_OPEN',
  'ANSWER_LOCKED',
  'REVEAL',
  'PROGRESS',
  'FINAL_CELEBRATION',
  'REPORT',
] as const;

export type GameSessionPhase = (typeof GAME_SESSION_PHASES)[number];
export type GameActorRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | null;

export type GameActor = {
  userId: string;
  role: GameActorRole;
  name: string;
};

export type GameQuizOptionRecord = {
  id: string;
  gameQuizQuestionId: string;
  orderIndex: number;
  text: string;
  isCorrect: boolean;
};

export type GameQuizQuestionRecord = {
  id: string;
  gameQuizId: string;
  orderIndex: number;
  prompt: string;
  hint: string | null;
  explanation: string | null;
  timerSeconds: number;
  maxPoints: number;
  options: GameQuizOptionRecord[];
};

export type GameQuizRecord = {
  id: string;
  ownerId: string;
  title: string;
  topic: string | null;
  difficulty: string | null;
  templateKey: GameQuizTemplateKey;
  randomizeQuestionOrder: boolean;
  randomizeAnswerOrder: boolean;
  showLeaderboard: boolean;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  questions?: GameQuizQuestionRecord[];
};

export type GameRoundOptionRecord = {
  id: string;
  roundId: string;
  sourceOptionId: string | null;
  orderIndex: number;
  text: string;
  isCorrect: boolean;
};

export type GameRoundRecord = {
  id: string;
  sessionId: string;
  sourceQuestionId: string | null;
  orderIndex: number;
  prompt: string;
  hint: string | null;
  explanation: string | null;
  timerSeconds: number;
  maxPoints: number;
  openedAt: Date | null;
  deadlineAt: Date | null;
  revealedAt: Date | null;
  options: GameRoundOptionRecord[];
};

export type GameParticipantRecord = {
  id: string;
  sessionId: string;
  userId: string;
  displayName: string;
  score: number;
  joinedAt: Date;
  lastSeenAt: Date | null;
  user?: { id: string; name: string; image: string | null };
};

export type GameAnswerRecord = {
  id: string;
  sessionId: string;
  participantId: string;
  roundId: string;
  selectedOptionId: string;
  idempotencyKey: string;
  submittedAt: Date;
  responseTimeMs: number;
  isCorrect: boolean;
  pointsAwarded: number;
  participant?: GameParticipantRecord;
  round?: GameRoundRecord;
};

export type GameSessionRecord = {
  id: string;
  gameQuizId: string;
  hostId: string;
  gameQuizRevision: number;
  templateKey: GameQuizTemplateKey;
  title: string;
  topic: string | null;
  difficulty: string | null;
  joinCode: string;
  phase: GameSessionPhase;
  currentRoundIndex: number | null;
  joiningLocked: boolean;
  randomizeQuestionOrder: boolean;
  randomizeAnswerOrder: boolean;
  showLeaderboard: boolean;
  stateVersion: number;
  startedAt: Date | null;
  endedAt: Date | null;
  joinCodeReleasedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  rounds?: GameRoundRecord[];
  participants?: GameParticipantRecord[];
  answers?: GameAnswerRecord[];
};

export type SessionWithGameData = GameSessionRecord & {
  rounds: GameRoundRecord[];
  participants: GameParticipantRecord[];
  answers: GameAnswerRecord[];
};

export type GameQuizWithQuestions = GameQuizRecord & {
  questions: GameQuizQuestionRecord[];
};
