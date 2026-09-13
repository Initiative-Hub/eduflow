import { QuizAttemptResults } from '@/components/quiz/quiz-attempt-results';
import { requireQuizPage } from '@/lib/quiz-attempt-page';
export default async function ResultsPage({
  params,
}: {
  params: Promise<{ courseId: string; quizId: string }>;
}) {
  const resolved = await params;
  await requireQuizPage(resolved.courseId, resolved.quizId);
  return <QuizAttemptResults {...resolved} />;
}
