import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { getGameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizJoinClient } from '@/components/game-quiz/game-quiz-join-client';

export default async function JoinGameQuizPage() {
  const t = await getTranslations('GameQuiz');

  return (
    <Suspense>
      <GameQuizJoinClient copy={getGameQuizCopy(t)} />
    </Suspense>
  );
}
