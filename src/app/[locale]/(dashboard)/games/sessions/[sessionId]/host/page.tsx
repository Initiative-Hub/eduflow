import { getTranslations } from 'next-intl/server';
import { getGameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizHostClient } from '@/components/game-quiz/game-quiz-host-client';

interface GameQuizHostPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function GameQuizHostPage({
  params,
}: GameQuizHostPageProps) {
  const [{ sessionId }, t] = await Promise.all([
    params,
    getTranslations('GameQuiz'),
  ]);
  return <GameQuizHostClient sessionId={sessionId} copy={getGameQuizCopy(t)} />;
}
