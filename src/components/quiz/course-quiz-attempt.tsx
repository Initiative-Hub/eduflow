'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { ConfirmDialog } from '@/components/custom/dialog/confirm-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  broadcastAttemptChange,
  useActiveQuizAttempts,
} from '@/hooks/use-active-quiz-attempts';
import { useQuizAttemptProgress } from '@/hooks/use-quiz-attempt-progress';
import { Link, useRouter } from '@/i18n/navigation';
import {
  type AttemptView,
  attemptErrorMessage,
  quizAttemptClient,
} from '@/lib/api/quiz-attempt-client';
import type { QuizContent } from '@/lib/quiz-template';
import { Quiz } from './quiz';
import { QuizIntro } from './quiz-intro';

type Props = {
  courseId: string;
  quizId: string;
  quiz: QuizContent;
  registerFlush?: (flush: (() => Promise<void>) | null) => void;
};

export function CourseQuizAttempt({
  courseId,
  quizId,
  quiz,
  registerFlush,
}: Props) {
  const t = useTranslations('QuizAttempts');
  const active = useActiveQuizAttempts();
  const activeId = active.attempts.find((a) => a.quizId === quizId)?.id;
  const load = useQuery({
    queryKey: ['quiz-attempt', active.userId, activeId],
    queryFn: () => quizAttemptClient.get(activeId!),
    enabled: !!activeId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    gcTime: 0,
  });
  const start = useMutation({
    mutationFn: () => quizAttemptClient.start(quizId),
    onSuccess: () => broadcastAttemptChange(),
  });
  const attempt = load.data ?? start.data;
  return (
    <div className="flex flex-col gap-4">
      {active.checking || (activeId && load.isPending && !start.data) ? (
        <Skeleton className="h-64 w-full" />
      ) : active.isError || load.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {t('loadError')}
            <Button
              variant="outline"
              onClick={() => {
                void active.refetch();
                void load.refetch();
              }}
            >
              {t('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : attempt ? (
        <AttemptWorkspace
          key={attempt.id}
          initial={attempt}
          registerFlush={registerFlush}
        />
      ) : (
        <>
          <fieldset disabled={start.isPending}>
            <QuizIntro quiz={quiz} onStart={() => start.mutate()} />
          </fieldset>
          <Button variant="outline" asChild>
            <Link href={`/courses/${courseId}/quiz/${quizId}/results`}>
              {t('results')}
            </Link>
          </Button>
          {start.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {attemptErrorMessage(start.error, t('loadError'))}
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}

function AttemptWorkspace({
  initial,
  registerFlush,
}: {
  initial: AttemptView;
  registerFlush?: Props['registerFlush'];
}) {
  const t = useTranslations('QuizAttempts');
  const router = useRouter();
  const resultHref = (id: string) =>
    `/courses/${initial.courseId}/quiz/${initial.quizId}/results/${id}`;
  const progress = useQuizAttemptProgress(initial, (result) =>
    router.push(resultHref(result.id))
  );
  useEffect(() => {
    registerFlush?.(progress.flush);
    return () => registerFlush?.(null);
  }, [progress.flush, registerFlush]);
  useEffect(() => {
    if (initial.status === 'COMPLETED') router.replace(resultHref(initial.id));
  }, [initial.id, initial.status, router]);

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="text-muted-foreground text-sm">
        {progress.saving
          ? t('saving')
          : progress.dirty
            ? t('unsaved')
            : t('saved')}
      </p>
      {progress.error != null && (
        <Alert variant="destructive">
          <AlertDescription>
            {progress.conflict
              ? t('conflict')
              : attemptErrorMessage(progress.error, t('saveError'))}
            <Button
              variant="outline"
              onClick={() =>
                progress.conflict
                  ? window.location.reload()
                  : void progress.retry()
              }
            >
              {progress.conflict ? t('reload') : t('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <Quiz
        quiz={progress.attempt.quiz}
        managed={{
          attempt: progress.attempt,
          answers: progress.answers,
          currentIndex: progress.currentIndex,
          disabled: progress.busy || progress.conflict,
          onAnswer: progress.answer,
          onNavigate: (index) => void progress.navigate(index),
          onCheck: () => void progress.checkAnswer(),
          onSubmit: () => void progress.finish('SUBMITTED'),
        }}
      />
      <ConfirmDialog
        title={t('endTitle')}
        description={t('endDescription')}
        cancelLabel={t('cancel')}
        confirmLabel={t('endAttempt')}
        isPending={progress.busy}
        onConfirm={() => void progress.finish('ENDED_EARLY')}
        trigger={
          <Button
            variant="outline"
            disabled={progress.busy || progress.conflict}
          >
            {t('endAttempt')}
          </Button>
        }
      />
    </div>
  );
}
