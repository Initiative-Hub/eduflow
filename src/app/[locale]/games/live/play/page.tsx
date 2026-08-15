import { getTranslations } from 'next-intl/server';
import { getGameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizPlayerClient } from '@/components/game-quiz/game-quiz-player-client';

export default async function GameQuizPlayPage() {
  const t = await getTranslations('GameQuiz');
  return <GameQuizPlayerClient copy={getGameQuizCopy(t)} />;
}
