import { getTranslations } from 'next-intl/server';
import { getGameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizReportClient } from '@/components/game-quiz/game-quiz-report-client';

export default async function GameQuizReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameQuizId: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { gameQuizId } = await params;
  const { run } = await searchParams;
  const t = await getTranslations('GameQuiz');
  return (
    <GameQuizReportClient
      copy={getGameQuizCopy(t)}
      gameQuizId={gameQuizId}
      runKey={run}
    />
  );
}
