import { getTranslations } from 'next-intl/server';
import { getGameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizReportClient } from '@/components/game-quiz/game-quiz-report-client';

export default async function GameQuizReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameQuizId: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { gameQuizId } = await params;
  const { sessionId } = await searchParams;
  const t = await getTranslations('GameQuiz');
  return (
    <GameQuizReportClient
      copy={getGameQuizCopy(t)}
      gameQuizId={gameQuizId}
      sessionId={sessionId}
    />
  );
}
