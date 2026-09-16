import * as z from 'zod';
import { requireQuizPage } from '@/lib/quiz-attempt-page';
import { GradeHistoryClient } from './grade-history-client';

export default async function GradeHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; courseId: string; quizId: string }>;
  searchParams: Promise<{ attemptId?: string | string[] }>;
}) {
  const [{ courseId, quizId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  await requireQuizPage(courseId, quizId);
  const parsedAttemptId = z.uuid().safeParse(query.attemptId);

  return (
    <GradeHistoryClient
      courseId={courseId}
      quizId={quizId}
      selectedAttemptId={
        parsedAttemptId.success ? parsedAttemptId.data : undefined
      }
    />
  );
}
