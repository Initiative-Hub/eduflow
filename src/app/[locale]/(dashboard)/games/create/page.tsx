import { getTranslations } from 'next-intl/server';
import { getGameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizEditorClient } from '@/components/game-quiz/game-quiz-editor-client';

export default async function CreateGameQuizPage() {
  const t = await getTranslations('GameQuiz');
  return <GameQuizEditorClient copy={getGameQuizCopy(t)} />;
}
