import type {
  ClientQuizContent,
  QuestionBlock,
  ScoreResult,
  StudentAnswer,
} from '@/lib/quiz-template/types';
import type { VocabularyItem } from '../VocabularyService';

export type WordbankSort = 'recent' | 'az' | 'weakest';
export type WordbankMasteryFilter = 'all' | 'due' | '0' | '1' | '2';

export type VocabularyListSummary = {
  id: string;
  name: string;
  colorCode: string | null;
  wordCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type SavedVocabularyItem = VocabularyItem & {
  id: string;
  savedAt: string;
  sourceSnippet: string | null;
  masteryLevel: number;
  nextReviewAt: string;
  lists: VocabularyListSummary[];
};

export interface WordbankStats {
  savedWords: number;
  savedToday: number;
  dueWords: number;
  newWords: number;
  familiarWords: number;
  masteredWords: number;
}

export interface SavedVocabularyListResult {
  items: SavedVocabularyItem[];
  total: number;
  filteredTotal: number;
  savedWords: string[];
  lists: VocabularyListSummary[];
  stats: WordbankStats;
}

export interface SaveVocabularyResult {
  savedCount: number;
  total: number;
  savedWords: string[];
}

export interface RemoveVocabularyResult {
  removedCount: number;
  total: number;
  savedWords: string[];
}

export type SaveVocabularyInput = VocabularyItem & {
  sourceSnippet?: string | null;
};

export interface WordbankListOptions {
  search?: string;
  listId?: string;
  mastery?: WordbankMasteryFilter;
  sort?: WordbankSort;
  limit?: number;
  offset?: number;
  now?: Date;
}

export interface CreateVocabularyListInput {
  name: string;
  colorCode?: string | null;
}

export interface UpdateVocabularyListInput {
  name?: string;
  colorCode?: string | null;
}

export interface UpdateSavedVocabularyItemsInput {
  vocabularyIds: string[];
  addListIds?: string[];
  removeListIds?: string[];
  masteryLevel?: number;
  exampleSentence?: string;
  examples?: string[];
}

export type UpdateSavedVocabularyItemsResult = Partial<
  Pick<SavedVocabularyListResult, 'lists' | 'savedWords' | 'stats' | 'total'>
> & {
  updatedCount: number;
};

export interface CreateReviewSessionInput {
  listId?: string;
  vocabularyIds?: string[];
  limit?: number;
  now?: Date;
}

export interface WordbankReviewSessionResult {
  sessionId: string;
  quiz: ClientQuizContent;
  dueCount: number;
}

export interface SubmitReviewSessionInput {
  answers: Record<string, StudentAnswer>;
  now?: Date;
}

export interface CheckReviewSessionAnswerInput {
  questionIndex: number;
  answer: StudentAnswer;
}

export interface CheckReviewSessionAnswerResult {
  isCorrect: boolean;
  reviewQuestion: QuestionBlock;
}

export interface WordbankReviewMasteryResult {
  savedVocabularyId: string;
  word: string;
  englishDefinition: string;
  vietnameseTranslation: string;
  previousMasteryLevel: number;
  nextMasteryLevel: number;
  isCorrect: boolean;
}

export interface SubmitReviewSessionResult extends ScoreResult {
  reviewQuestions: QuestionBlock[];
  masteryResults: WordbankReviewMasteryResult[];
}

export type ReviewWordMapItem = {
  questionIndex: number;
  savedVocabularyId: string;
};
