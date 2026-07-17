import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { GradeHistoryClient } from './grade-history-client';

interface GradeHistoryPageProps {
  params: Promise<{ courseId: string; quizId: string }>;
}

export default async function GradeHistoryPage({
  params,
}: GradeHistoryPageProps) {
  const [{ courseId, quizId }, requestHeaders] = await Promise.all([
    params,
    headers(),
  ]);
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) redirect('/login');

  return <GradeHistoryClient courseId={courseId} quizId={quizId} />;
}
