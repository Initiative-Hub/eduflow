import { requireQuizPage } from '@/lib/quiz-attempt-page';
import { QuizPlayerClient } from './quiz-player-client';
export default async function QuizPlayerPage({
  params,
}: {
  params: Promise<{ courseId: string; quizId: string }>;
}) {
  const resolved = await params;
  await requireQuizPage(resolved.courseId, resolved.quizId);
  return <QuizPlayerClient {...resolved} />;
}
