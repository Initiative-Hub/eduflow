import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { QuestionBlock } from '@/lib/quiz-template/types';
import { quizService } from './quiz.service';

interface UseQuizOptions {
  courseId: string;
  quizId: string;
}

export function useQuiz({ courseId, quizId }: UseQuizOptions) {
  const queryClient = useQueryClient();
  const t = useTranslations('Courses.QuizPlayer');

  const saveQuestionsMutation = useMutation({
    mutationFn: async ({
      questions,
      questionIds,
    }: {
      questions: QuestionBlock[];
      questionIds: Array<string | null>;
    }) => {
      return quizService.saveQuestions(quizId, questions, questionIds);
    },
    onSuccess: (updatedQuiz) => {
      queryClient.setQueryData(
        ['quizzes', courseId],
        (oldQuizzes: any[] | undefined) => {
          if (!oldQuizzes) return oldQuizzes;
          return oldQuizzes.map((q) =>
            q.id === quizId
              ? {
                  ...q,
                  ...updatedQuiz,
                }
              : q
          );
        }
      );
      toast.success(t('saveSuccess'));
    },
    onError: () => {
      toast.error('Failed to save quiz questions');
    },
  });

  const generateQuestionsMutation = useMutation({
    mutationFn: async (context?: string) => {
      return quizService.generateQuestions(quizId, context);
    },
    onSuccess: (updatedQuiz: any) => {
      queryClient.setQueryData(
        ['quizzes', courseId],
        (oldQuizzes: any[] | undefined) => {
          if (!oldQuizzes) return oldQuizzes;
          return oldQuizzes.map((q) =>
            q.id === quizId
              ? {
                  ...q,
                  ...updatedQuiz,
                }
              : q
          );
        }
      );
      toast.success('AI questions generated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Failed to generate AI questions');
    },
  });

  return {
    saveQuestions: (
      questions: QuestionBlock[],
      questionIds: Array<string | null>
    ) => saveQuestionsMutation.mutate({ questions, questionIds }),
    isSavingQuestions: saveQuestionsMutation.isPending,
    generateQuestions: generateQuestionsMutation.mutate,
    isGeneratingQuestions: generateQuestionsMutation.isPending,
  };
}
