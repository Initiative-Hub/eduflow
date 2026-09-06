'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { calculateScore } from '@/lib/quiz-template/scoring';
import type {
  QuestionBlock,
  QuizSchema,
  ScoreResult,
  StudentAnswer,
  StudentAnswers,
} from '@/lib/quiz-template/types';

interface UseQuizSubmissionOptions {
  /** Quiz ID for server-side scoring (secure mode) */
  quizId?: string;
  submitUrl?: string;
  quizType: string;
  /** Full questions with answers — used for local scoring in demo/offline mode when no quizId is provided */
  questionsForScoring?: QuestionBlock[];
  onSuccess?: (result: ScoreResult, reviewQuestions?: QuestionBlock[]) => void;
  errorMessage?: string;
}

interface UseQuizSubmissionReturn {
  submit: (answers: StudentAnswers) => Promise<void>;
  isSubmitting: boolean;
  result: ScoreResult | null;
  reviewQuestions: QuestionBlock[] | null;
  error: string | null;
}

export function useQuizSubmission({
  quizId,
  submitUrl,
  quizType,
  questionsForScoring,
  onSuccess,
  errorMessage,
}: UseQuizSubmissionOptions): UseQuizSubmissionReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [reviewQuestions, setReviewQuestions] = useState<
    QuestionBlock[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (answers: StudentAnswers) => {
      setIsSubmitting(true);
      setError(null);

      try {
        let scoreResult: ScoreResult;
        let returnedQuestions: QuestionBlock[] | undefined;

        if (quizId) {
          // Secure mode: send only quizId + answers to the server
          const answersRecord: Record<string, StudentAnswer> = {};
          for (const [index, answer] of answers.entries()) {
            answersRecord[index.toString()] = answer;
          }

          const response = await fetch(submitUrl ?? '/api/v1/quizzes/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            body: JSON.stringify({ quizId, answers: answersRecord }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(
              errorData?.message || `Failed to submit quiz (${response.status})`
            );
          }

          const responseData = await response.json();
          const { reviewQuestions: reviewQs, ...score } =
            responseData as ScoreResult & {
              reviewQuestions?: QuestionBlock[];
            };
          scoreResult = score;
          returnedQuestions = reviewQs;
        } else if (questionsForScoring) {
          // Demo/offline mode: score locally using provided questions
          const schema: QuizSchema = {
            type: quizType,
            constraints: { minQuestions: 1, maxQuestions: 100 },
            scoring: { pointsPerQuestion: 10 },
            questions: questionsForScoring,
          };
          scoreResult = calculateScore(answers, schema);
          returnedQuestions = questionsForScoring;
        } else {
          throw new Error('No quizId or questions provided for scoring');
        }

        setResult(scoreResult);
        if (returnedQuestions) {
          setReviewQuestions(returnedQuestions);
        }
        onSuccess?.(scoreResult, returnedQuestions);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : errorMessage || 'Failed to submit quiz';
        setError(msg);
        toast.error(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [quizId, submitUrl, quizType, questionsForScoring, onSuccess, errorMessage]
  );

  return { submit, isSubmitting, result, reviewQuestions, error };
}
