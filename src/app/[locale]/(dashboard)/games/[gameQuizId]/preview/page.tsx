import { GameQuizPreviewClient } from '@/components/game-quiz/game-quiz-preview-client';
import { getGameQuizCopy } from '@/components/game-quiz/copy';
import { getTranslations } from 'next-intl/server';

interface GameQuizPreviewPageProps {
  params: Promise<{ gameQuizId: string }>;
}

export default async function GameQuizPreviewPage({
  params,
}: GameQuizPreviewPageProps) {
  const [{ gameQuizId }, t] = await Promise.all([
    params,
    getTranslations('GameQuiz'),
  ]);
  return (
    <GameQuizPreviewClient gameQuizId={gameQuizId} copy={getGameQuizCopy(t)} />
  );
}
