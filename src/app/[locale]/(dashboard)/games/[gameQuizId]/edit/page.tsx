import { getTranslations } from 'next-intl/server';
import { getGameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizEditorClient } from '@/components/game-quiz/game-quiz-editor-client';

interface EditGameQuizPageProps {
  params: Promise<{ gameQuizId: string }>;
}

export default async function EditGameQuizPage({
  params,
}: EditGameQuizPageProps) {
  const [{ gameQuizId }, t] = await Promise.all([
    params,
    getTranslations('GameQuiz'),
  ]);
  return (
    <GameQuizEditorClient gameQuizId={gameQuizId} copy={getGameQuizCopy(t)} />
  );
}
