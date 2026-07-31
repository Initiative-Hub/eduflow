import { GameQuizEditorClient } from '@/components/game-quiz/game-quiz-editor-client';
import { getGameQuizCopy } from '@/components/game-quiz/copy';
import { getTranslations } from 'next-intl/server';

export default async function CreateGameQuizPage() {
  const t = await getTranslations('GameQuiz');
  return <GameQuizEditorClient copy={getGameQuizCopy(t)} />;
}
