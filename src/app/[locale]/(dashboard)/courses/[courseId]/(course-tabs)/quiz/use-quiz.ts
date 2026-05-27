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
    mutationFn: async (updatedQuestions: QuestionBlock[]) => {
      return quizService.saveQuestions(quizId, updatedQuestions);
    },
    onSuccess: (data, updatedQuestions) => {
      queryClient.setQueryData(
        ['quizzes', courseId],
        (oldQuizzes: any[] | undefined) => {
          if (!oldQuizzes) return oldQuizzes;
          return oldQuizzes.map((q) =>
            q.id === quizId
              ? {
                  ...q,
                  questions: updatedQuestions,
                  questionCount: updatedQuestions.length,
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

  return {
    saveQuestions: saveQuestionsMutation.mutate,
    isSavingQuestions: saveQuestionsMutation.isPending,
  };
}
