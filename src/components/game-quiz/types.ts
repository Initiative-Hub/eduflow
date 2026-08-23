import type {
  GameQuizAIGeneratedQuestion,
  GameQuizAIGenerationInput,
  GameQuizAISourcesResponse,
} from '@/lib/game-quiz/ai-schemas';
import type { GameSessionReport } from '@/lib/game-quiz/types';

export type GameQuizDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type GameSessionPhase =
  | 'LOBBY'
  | 'QUESTION_OPEN'
  | 'REVEAL'
  | 'SCOREBOARD'
  | 'FINAL_CELEBRATION';

export interface Answerer {
  id: string;
  displayName: string;
  image?: string | null;
}

export interface GameQuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
  answerCount?: number;
  answerers?: Answerer[];
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
  realtimeKey?: string;
  displayName: string;
  image?: string | null;
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
  gameQuizId: string;
  realtimeKey: string;
  gameTitle: string;
  joinCode: string;
  joiningLocked: boolean;
  phase: GameSessionPhase;
  closedReason?: 'HOST_LEFT' | 'VIEWED_REPORT' | null;
  endedAt?: string | null;
  stateVersion: number;
  currentRound?: GameRound | null;
  currentRoundIndex: number;
  totalRounds: number;
  participant?: GameParticipant | null;
  participants: GameParticipant[];
  answerCount: number;
  leaderboard: GameParticipant[];
  myAnswer?: {
    optionId: string;
    isCorrect?: boolean;
    pointsAwarded?: number;
  } | null;
}

export type GameQuizReport = GameSessionReport;

export interface GameQuizDraft {
  title: string;
  topic: string;
  difficulty: GameQuizDifficulty;
  settings: GameQuizSettings;
  revision?: number;
  questions: GameQuizQuestion[];
}

export type GameQuizAiSources = GameQuizAISourcesResponse;
export type GameQuizAiSourceCourse = GameQuizAiSources['courses'][number];
export type GameQuizAiSourceModule = GameQuizAiSourceCourse['modules'][number];
export type GameQuizAiSourceLesson = GameQuizAiSourceModule['lessons'][number];
export type GeneratedGameQuizQuestion = GameQuizAIGeneratedQuestion;
export type GenerateGameQuizQuestionsInput = GameQuizAIGenerationInput;
