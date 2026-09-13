'use client';

import { useQuery } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Link, useRouter } from '@/i18n/navigation';
import { quizAttemptClient } from '@/lib/api/quiz-attempt-client';
import { useSession } from '@/lib/auth-client';
import type { QuizContent } from '@/lib/quiz-template';
import { QuizResult } from './quiz-result';

export function QuizAttemptResults({
  courseId,
  quizId,
  attemptId,
}: {
  courseId: string;
  quizId: string;
  attemptId?: string;
}) {
  const t = useTranslations('QuizAttempts');
  const formatter = useFormatter();
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user.id;
  const base = `/courses/${courseId}/quiz/${quizId}`;
  const history = useQuery({
    queryKey: ['quiz-results', userId, quizId],
    queryFn: () => quizAttemptClient.history(quizId),
    enabled: !!userId && !attemptId,
  });
  const detail = useQuery({
    queryKey: ['quiz-result', userId, attemptId],
    queryFn: () => quizAttemptClient.get(attemptId!),
    enabled: !!userId && !!attemptId,
  });
  const loading = attemptId ? detail.isPending : history.isPending;
  const attempt = detail.data;
  const mismatch =
    attempt &&
    (attempt.quizId !== quizId ||
      attempt.courseId !== courseId ||
      attempt.status !== 'COMPLETED');
  const failed = (attemptId ? detail.isError : history.isError) || mismatch;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-semibold text-2xl">{t('results')}</h1>
        <div className="flex gap-2">
          {attemptId && (
            <Button variant="outline" asChild>
              <Link href={`${base}/results`}>{t('backToResults')}</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={base}>{t('takeResume')}</Link>
          </Button>
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : failed ? (
        <Alert variant="destructive">
          <AlertDescription>
            {t('loadError')}
            <Button
              variant="outline"
              onClick={() =>
                void (attemptId ? detail.refetch() : history.refetch())
              }
            >
              {t('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : attemptId && attempt?.result ? (
        <>
          <p className="text-muted-foreground text-sm">
            {attempt.completedAt &&
              formatter.dateTime(new Date(attempt.completedAt), {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}{' '}
            ·{' '}
            {t(
              attempt.completionReason === 'ENDED_EARLY'
                ? 'endedEarly'
                : 'submitted'
            )}
          </p>
          {attempt.isLegacySnapshot && (
            <Alert>
              <AlertDescription>{t('legacySnapshot')}</AlertDescription>
            </Alert>
          )}
          <QuizResult
            quiz={attempt.quiz as QuizContent}
            answers={
              new Map(
                Object.entries(attempt.answers).map(([index, answer]) => [
                  Number(index),
                  answer,
                ])
              )
            }
            result={attempt.result}
            onRetry={() => router.push(base)}
          />
        </>
      ) : history.data?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('completedAt')}</TableHead>
              <TableHead>{t('score')}</TableHead>
              <TableHead>{t('answered')}</TableHead>
              <TableHead>{t('completion')}</TableHead>
              <TableHead>{t('review')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.data.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    className="underline underline-offset-4"
                    href={`${base}/results/${row.id}`}
                  >
                    {row.completedAt
                      ? formatter.dateTime(new Date(row.completedAt), {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : t('viewResult')}
                  </Link>
                </TableCell>
                <TableCell>
                  {row.score}/{row.maxScore} ({Math.round(row.percentage ?? 0)}
                  %)
                </TableCell>
                <TableCell>{row.answeredCount}</TableCell>
                <TableCell>
                  {t(
                    row.completionReason === 'ENDED_EARLY'
                      ? 'endedEarly'
                      : 'submitted'
                  )}
                </TableCell>
                <TableCell>
                  {row.hasPendingReview && (
                    <Badge variant="secondary">{t('pendingReview')}</Badge>
                  )}
                  <Button variant="link" asChild>
                    <Link href={`${base}/results/${row.id}`}>
                      {t('viewResult')}
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Alert>
          <AlertDescription>{t('empty')}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
