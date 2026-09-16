import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { getGameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizJoinClient } from '@/components/game-quiz/game-quiz-join-client';
import { auth } from '@/lib/auth';

export default async function JoinGameQuizPage() {
  const [t, session] = await Promise.all([
    getTranslations('GameQuiz'),
    auth.api.getSession({ headers: await headers() }),
  ]);

  return (
    <Suspense>
      <GameQuizJoinClient
        copy={getGameQuizCopy(t)}
        isAuthenticated={Boolean(session)}
      />
    </Suspense>
  );
}
