import { QuizPlayerClient } from './quiz-player-client';

interface QuizPlayerPageProps {
  params: Promise<{ courseId: string; quizId: string }>;
}

export default async function QuizPlayerPage({ params }: QuizPlayerPageProps) {
  const { courseId, quizId } = await params;

  return <QuizPlayerClient courseId={courseId} quizId={quizId} />;
}
