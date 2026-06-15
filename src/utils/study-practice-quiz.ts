import type { UIMessage } from 'ai';
import type { DeliveryMode } from '@/generated/prisma';
import type { QuizContent } from '@/lib/quiz-template';

export interface StudyPracticeQuizData {
  quiz: QuizContent;
  deliveryMode: Extract<DeliveryMode, 'INSTANT_FEEDBACK'>;
}

export type StudyUIMessage = UIMessage<
  unknown,
  {
    suggestions: { items: string[] };
    'practice-quiz': StudyPracticeQuizData;
  }
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function isStudyPracticeQuizData(
  data: unknown
): data is StudyPracticeQuizData {
  if (!isRecord(data) || data.deliveryMode !== 'INSTANT_FEEDBACK') return false;
  if (!isRecord(data.quiz)) return false;

  return (
    typeof data.quiz.title === 'string' &&
    typeof data.quiz.description === 'string' &&
    typeof data.quiz.type === 'string' &&
    Array.isArray(data.quiz.questions)
  );
}

export function getStudyPracticeQuizParts(
  message: UIMessage
): StudyPracticeQuizData[] {
  return message.parts.flatMap((part) => {
    if (part.type !== 'data-practice-quiz') return [];
    return isStudyPracticeQuizData(part.data) ? [part.data] : [];
  });
}
