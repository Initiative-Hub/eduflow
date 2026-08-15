import { getTranslations } from 'next-intl/server';
import { getGameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizLibraryClient } from '@/components/game-quiz/game-quiz-library-client';

export default async function GameQuizLibraryPage() {
  const t = await getTranslations('GameQuiz');
  return <GameQuizLibraryClient copy={getGameQuizCopy(t)} />;
}
