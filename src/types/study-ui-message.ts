import type { UIMessage } from 'ai';
import type { StudyInteractiveContentData } from '@/utils/study-interactive-content';
import type { StudyPracticeQuizData } from '@/utils/study-practice-quiz';

export type StudyUIMessage = UIMessage<
  unknown,
  {
    suggestions: { items: string[] };
    'practice-quiz': StudyPracticeQuizData;
    'interactive-content': StudyInteractiveContentData;
  }
>;
