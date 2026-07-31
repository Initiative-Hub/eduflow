import { getTranslations } from 'next-intl/server';
import { getGameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizReportClient } from '@/components/game-quiz/game-quiz-report-client';

interface GameQuizReportPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function GameQuizReportPage({
  params,
}: GameQuizReportPageProps) {
  const [{ sessionId }, t] = await Promise.all([
    params,
    getTranslations('GameQuiz'),
  ]);
  return (
    <GameQuizReportClient sessionId={sessionId} copy={getGameQuizCopy(t)} />
  );
}
