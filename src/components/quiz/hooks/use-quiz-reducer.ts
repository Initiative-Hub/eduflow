'use client';

import { useReducer } from 'react';
import type {
  QuestionBlock,
  ScoreResult,
  StudentAnswer,
  StudentAnswers,
} from '@/lib/quiz-template/types';

// ─── State ───────────────────────────────────────────────────────────────────

export type QuizPhase = 'idle' | 'in-progress' | 'completed';

export interface QuizState {
  phase: QuizPhase;
  currentIndex: number;
  answers: StudentAnswers;
  result: ScoreResult | null;
  reviewQuestions: QuestionBlock[] | null;
  isSubmitting: boolean;
  error: string | null;
  answerRevealed: boolean;
  instantResults: Map<number, boolean | null>;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type QuizAction =
  | { type: 'START' }
  | { type: 'ANSWER'; index: number; answer: StudentAnswer }
  | { type: 'NEXT' }
  | { type: 'PREVIOUS' }
  | { type: 'SUBMIT_START' }
  | {
      type: 'SUBMIT_SUCCESS';
      result: ScoreResult;
      reviewQuestions?: QuestionBlock[];
    }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'REVEAL_ANSWER'; index: number; isCorrect: boolean }
  | { type: 'RETRY' };

// ─── Initial State ───────────────────────────────────────────────────────────

function createInitialState(): QuizState {
  return {
    phase: 'idle',
    currentIndex: 0,
    answers: new Map(),
    result: null,
    reviewQuestions: null,
    isSubmitting: false,
    error: null,
    answerRevealed: false,
    instantResults: new Map(),
  };
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'START':
      return {
        ...createInitialState(),
        phase: 'in-progress',
      };

    case 'ANSWER': {
      if (state.answerRevealed) return state;
      const nextAnswers = new Map(state.answers);
      nextAnswers.set(action.index, action.answer);
      return { ...state, answers: nextAnswers };
    }

    case 'NEXT':
      return {
        ...state,
        currentIndex: state.currentIndex + 1,
        answerRevealed: false,
      };

    case 'PREVIOUS': {
      const prevIndex = Math.max(0, state.currentIndex - 1);
      return {
        ...state,
        currentIndex: prevIndex,
        answerRevealed: state.instantResults.has(prevIndex),
      };
    }

    case 'SUBMIT_START':
      return { ...state, isSubmitting: true, error: null };

    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        isSubmitting: false,
        phase: 'completed',
        result: action.result,
        reviewQuestions: action.reviewQuestions ?? null,
      };

    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: false, error: action.error };

    case 'REVEAL_ANSWER': {
      const nextInstantResults = new Map(state.instantResults);
      nextInstantResults.set(action.index, action.isCorrect);
      return {
        ...state,
        answerRevealed: true,
        instantResults: nextInstantResults,
      };
    }

    case 'RETRY':
      return {
        ...createInitialState(),
        phase: 'in-progress',
      };

    default:
      return state;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useQuizReducer() {
  return useReducer(quizReducer, undefined, createInitialState);
}
