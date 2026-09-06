'use client';

import { useCallback, useState } from 'react';
import { calculateScore } from '@/lib/quiz-template/scoring';
import type { QuestionBlock, StudentAnswer } from '@/lib/quiz-template/types';

interface UseInstantFeedbackOptions {
  quizType: string;
  questionsForScoring: QuestionBlock[];
  instantFeedbackUrl?: string;
}

interface UseInstantFeedbackReturn {
  checkAnswer: (index: number, answer: StudentAnswer) => Promise<void>;
  isRevealed: boolean;
  instantResults: Map<number, boolean | null>;
  instantReviewQuestions: Map<number, QuestionBlock>;
  setRevealed: (revealed: boolean) => void;
  resetRevealed: (index: number) => void;
  reset: () => void;
}

export function useInstantFeedback({
  quizType,
  questionsForScoring,
  instantFeedbackUrl,
}: UseInstantFeedbackOptions): UseInstantFeedbackReturn {
  const [isRevealed, setIsRevealed] = useState(false);
  const [instantResults, setInstantResults] = useState<
    Map<number, boolean | null>
  >(new Map());
  const [instantReviewQuestions, setInstantReviewQuestions] = useState<
    Map<number, QuestionBlock>
  >(new Map());

  const checkAnswer = useCallback(
    async (index: number, answer: StudentAnswer) => {
      try {
        const singleQuestion = questionsForScoring[index];
        if (!singleQuestion) return;

        let isCorrect: boolean | null = null;
        let reviewQuestion: QuestionBlock | undefined;

        if (instantFeedbackUrl) {
          const response = await fetch(instantFeedbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify({
              answer,
              questionIndex: index,
            }),
          });

          if (!response.ok) throw new Error('Instant feedback failed');
          const data = await response.json();
          isCorrect = data.isCorrect ?? null;
          reviewQuestion = data.reviewQuestion;
        } else {
          const scoreResult = calculateScore(new Map([[0, answer]]), {
            type: quizType,
            constraints: { minQuestions: 1, maxQuestions: 100 },
            scoring: { pointsPerQuestion: 10 },
            questions: [singleQuestion],
          });
          isCorrect = scoreResult.questionResults[0]?.isCorrect ?? null;
          reviewQuestion = singleQuestion;
        }

        setInstantResults((prev) => {
          const next = new Map(prev);
          next.set(index, isCorrect);
          return next;
        });
        if (reviewQuestion) {
          setInstantReviewQuestions((prev) => {
            const next = new Map(prev);
            next.set(index, reviewQuestion);
            return next;
          });
        }
      } catch {
        // If scoring fails, still allow progression
        setInstantResults((prev) => {
          const next = new Map(prev);
          next.set(index, null);
          return next;
        });
      } finally {
        setIsRevealed(true);
      }
    },
    [instantFeedbackUrl, quizType, questionsForScoring]
  );

  const setRevealed = useCallback((revealed: boolean) => {
    setIsRevealed(revealed);
  }, []);

  const resetRevealed = useCallback(
    (index: number) => {
      setIsRevealed(instantResults.has(index));
    },
    [instantResults]
  );

  const reset = useCallback(() => {
    setIsRevealed(false);
    setInstantResults(new Map());
    setInstantReviewQuestions(new Map());
  }, []);

  return {
    checkAnswer,
    isRevealed,
    instantResults,
    instantReviewQuestions,
    setRevealed,
    resetRevealed,
    reset,
  };
}
