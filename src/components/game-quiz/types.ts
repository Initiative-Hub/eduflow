export type GameQuizDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type GameSessionPhase =
  | 'LOBBY'
  | 'QUESTION_OPEN'
  | 'ANSWER_LOCKED'
  | 'REVEAL'
  | 'PROGRESS'
  | 'FINAL_CELEBRATION'
  | 'REPORT'
  | 'ENDED';

export interface GameQuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface GameQuizQuestion {
  id: string;
  prompt: string;
  hint?: string | null;
  explanation?: string | null;
  timeLimitSeconds: number;
  maxPoints: number;
  order: number;
  options: GameQuizOption[];
}

export interface GameQuizSettings {
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  leaderboardEnabled: boolean;
}

export interface GameQuiz {
  id: string;
  title: string;
  topic: string;
  difficulty: GameQuizDifficulty;
  templateKey: 'LIVE_QUIZ_RALLY';
  revision: number;
  updatedAt: string;
  questionCount: number;
  settings: GameQuizSettings;
  questions?: GameQuizQuestion[];
}

export interface GameParticipant {
  id: string;
  displayName: string;
  score: number;
  isOnline?: boolean;
  joinedAt?: string;
}

export interface GameRound {
  id: string;
  order: number;
  prompt: string;
  hint?: string | null;
  explanation?: string | null;
  timeLimitSeconds: number;
  maxPoints: number;
  openedAt?: string | null;
  deadlineAt?: string | null;
  options: GameQuizOption[];
}

export interface GameSessionSnapshot {
  id: string;
  gameQuizId: string;
  gameTitle: string;
  joinCode: string;
  joiningLocked: boolean;
  phase: GameSessionPhase;
  stateVersion: number;
  currentRound?: GameRound | null;
  currentRoundIndex: number;
  totalRounds: number;
  participant?: GameParticipant | null;
  participants: GameParticipant[];
  answerCount: number;
  leaderboard: GameParticipant[];
  leaderboardEnabled: boolean;
  myAnswer?: {
    optionId: string;
    isCorrect?: boolean;
    pointsAwarded?: number;
  } | null;
}

export interface GameQuizReport {
  session: Pick<
    GameSessionSnapshot,
    'id' | 'gameTitle' | 'joinCode' | 'phase'
  > & {
    createdAt: string;
    completedAt?: string | null;
  };
  participants: GameParticipant[];
  rounds: Array<{
    id: string;
    order: number;
    prompt: string;
    responseCount: number;
    correctCount: number;
    averagePoints: number;
  }>;
}

export interface GameQuizDraft {
  title: string;
  topic: string;
  difficulty: GameQuizDifficulty;
  settings: GameQuizSettings;
  revision?: number;
  questions: GameQuizQuestion[];
}
