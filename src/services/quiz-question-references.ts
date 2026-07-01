import type { QuestionBlock } from '@/lib/quiz-template/types';

interface ReferencedQuestion {
  questionId: string;
  orderIndex: number;
  question: {
    answerData: unknown;
    explanation: string | null;
  };
}

export function getQuestionPrompt(question: object): string {
  const promptFields = question as {
    prompt?: unknown;
    promptTemplate?: unknown;
  };
  if (typeof promptFields.prompt === 'string') return promptFields.prompt;
  if (typeof promptFields.promptTemplate === 'string') {
    return promptFields.promptTemplate;
  }
  return '';
}

export function resolveReferencedQuestions(
  references: ReferencedQuestion[],
  legacyQuestions: unknown
): { questionIds: string[]; questions: QuestionBlock[] } {
  if (references.length === 0) {
    return {
      questionIds: [],
      questions: Array.isArray(legacyQuestions)
        ? (legacyQuestions as QuestionBlock[])
        : [],
    };
  }

  const orderedReferences = references.toSorted(
    (left, right) => left.orderIndex - right.orderIndex
  );

  return {
    questionIds: orderedReferences.map(({ questionId }) => questionId),
    questions: orderedReferences.map(({ question }) => {
      const answerData = question.answerData as QuestionBlock;
      return question.explanation && !answerData.explanation
        ? { ...answerData, explanation: question.explanation }
        : answerData;
    }),
  };
}
