import { getTranslations } from 'next-intl/server';
import { getGameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizJoinClient } from '@/components/game-quiz/game-quiz-join-client';

export default async function JoinGameQuizPage() {
  const t = await getTranslations('GameQuiz');
  return <GameQuizJoinClient copy={getGameQuizCopy(t)} />;
}
