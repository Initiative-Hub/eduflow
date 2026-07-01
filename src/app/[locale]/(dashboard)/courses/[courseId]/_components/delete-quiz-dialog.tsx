'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/custom/dialog';
import { Button } from '@/components/ui/button';
import { quizService } from '../(course-tabs)/quiz/quiz.service';

interface DeleteQuizDialogProps {
  courseId: string;
  quizId: string;
  quizTitle: string;
}

export function DeleteQuizDialog({
  courseId,
  quizId,
  quizTitle,
}: DeleteQuizDialogProps) {
  const t = useTranslations('Courses.QuizDelete');
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => quizService.deleteQuiz(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', courseId] });
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      toast.success(t('success'));
    },
    onError: () => toast.error(t('error')),
  });

  return (
    <ConfirmDialog
      cancelLabel={t('cancel')}
      confirmIcon={<Trash2 data-icon="inline-start" />}
      confirmLabel={t('confirm')}
      description={t('description', { title: quizTitle })}
      destructive
      icon={<Trash2 />}
      isPending={mutation.isPending}
      onConfirm={({ close }) =>
        mutation.mutate(undefined, { onSuccess: close })
      }
      pendingLabel={t('deleting')}
      title={t('title')}
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          title={t('trigger')}
        >
          <Trash2 />
          <span className="sr-only">{t('trigger')}</span>
        </Button>
      }
    />
  );
}
