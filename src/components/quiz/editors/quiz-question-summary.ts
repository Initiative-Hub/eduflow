import type { QuestionBlock } from '@/lib/quiz-template/types';

function compactList(values: string[]) {
  return values.filter(Boolean).join(', ');
}

function getMatchingCode(
  items: Array<{ id: string }>,
  itemId: string,
  prefix: string
) {
  const index = items.findIndex((item) => item.id === itemId);
  return index >= 0 ? `${prefix}${index + 1}` : itemId;
}

export function getQuestionSummary(question: QuestionBlock) {
  if (question.type === 'fill_in_the_blank') {
    return question.prompt?.trim() || question.promptTemplate;
  }

  return 'prompt' in question ? question.prompt : '';
}

export function getSolutionSummary(question: QuestionBlock) {
  switch (question.type) {
    case 'multiple_choice':
      return compactList(
        question.options
          .filter((option) => option.isCorrect)
          .map((option) => option.text)
      );
    case 'true_false':
      return question.correctAnswer ? 'True' : 'False';
    case 'fill_in_the_blank':
      return compactList(
        question.blanks.flatMap((blank) => blank.acceptableAnswers)
      );
    case 'matching':
      return compactList(
        question.correctPairs.map((pair) => {
          const leftCode = getMatchingCode(
            question.leftItems,
            pair.leftId,
            'L'
          );
          const rightCode = getMatchingCode(
            question.rightItems,
            pair.rightId,
            'R'
          );
          return `${leftCode} <-> ${rightCode}`;
        })
      );
    case 'ordering':
      return question.correctOrder
        .map((itemId) => getMatchingCode(question.items, itemId, '#'))
        .join(' -> ');
    case 'drag_and_drop':
      return compactList(
        Object.entries(question.correctMapping).map(([zoneId, itemId]) => {
          const item = question.items.find((entry) => entry.id === itemId);
          return `${zoneId}: ${item?.text ?? itemId}`;
        })
      );
    case 'essay':
      return question.rubric?.length
        ? compactList(question.rubric.map((criterion) => criterion.label))
        : '';
  }
}
