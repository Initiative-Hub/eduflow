import { getTranslations } from 'next-intl/server';
import { getGameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizPlayerClient } from '@/components/game-quiz/game-quiz-player-client';

interface PlayGameQuizPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function PlayGameQuizPage({
  params,
}: PlayGameQuizPageProps) {
  const [{ sessionId }, t] = await Promise.all([
    params,
    getTranslations('GameQuiz'),
  ]);
  return (
    <GameQuizPlayerClient sessionId={sessionId} copy={getGameQuizCopy(t)} />
  );
}
