import { redirect } from '@/i18n/navigation';
import { requireQuizPage } from '@/lib/quiz-attempt-page';
export default async function GradeHistoryPage({
  params,
}: {
  params: Promise<{ locale: string; courseId: string; quizId: string }>;
}) {
  const { locale, courseId, quizId } = await params;
  await requireQuizPage(courseId, quizId);
  redirect({ href: `/courses/${courseId}/quiz/${quizId}/results`, locale });
}
