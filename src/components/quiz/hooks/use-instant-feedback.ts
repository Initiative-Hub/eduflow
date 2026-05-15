'use client';

import { useCallback, useState } from 'react';
import type { QuestionBlock, StudentAnswer } from '@/lib/quiz-template/types';

interface UseInstantFeedbackOptions {
  quizType: string;
  questionsForScoring: QuestionBlock[];
}

interface UseInstantFeedbackReturn {
  checkAnswer: (index: number, answer: StudentAnswer) => Promise<void>;
  isRevealed: boolean;
  instantResults: Map<number, boolean | null>;
  setRevealed: (revealed: boolean) => void;
  resetRevealed: (index: number) => void;
  reset: () => void;
}

export function useInstantFeedback({
  quizType,
  questionsForScoring,
}: UseInstantFeedbackOptions): UseInstantFeedbackReturn {
  const [isRevealed, setIsRevealed] = useState(false);
  const [instantResults, setInstantResults] = useState<
    Map<number, boolean | null>
  >(new Map());

  const checkAnswer = useCallback(
    async (index: number, answer: StudentAnswer) => {
      setIsRevealed(true);

      try {
        const singleQuestion = questionsForScoring[index];
        if (!singleQuestion) return;

        const answersRecord: Record<string, StudentAnswer> = {
          '0': answer,
        };

        const response = await fetch('/api/v1/quizzes/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({
            quizType,
            questions: [singleQuestion],
            answers: answersRecord,
            pointsPerQuestion: 10,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const isCorrect = data.questionResults?.[0]?.isCorrect ?? null;
          setInstantResults((prev) => {
            const next = new Map(prev);
            next.set(index, isCorrect);
            return next;
          });
        }
      } catch {
        // If scoring fails, still allow progression
      }
    },
    [quizType, questionsForScoring]
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
  }, []);

  return {
    checkAnswer,
    isRevealed,
    instantResults,
    setRevealed,
    resetRevealed,
    reset,
  };
}
