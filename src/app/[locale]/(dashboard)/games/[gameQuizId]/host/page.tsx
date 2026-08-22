import { getTranslations } from 'next-intl/server';
import { getGameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizHostClient } from '@/components/game-quiz/game-quiz-host-client';

export default async function GameQuizHostPage({
  params,
}: {
  params: Promise<{ gameQuizId: string }>;
}) {
  const { gameQuizId } = await params;
  const t = await getTranslations('GameQuiz');
  return (
    <GameQuizHostClient copy={getGameQuizCopy(t)} gameQuizId={gameQuizId} />
  );
}
