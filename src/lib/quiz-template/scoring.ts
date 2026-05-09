import type {
  DragAndDropQuestion,
  FillInTheBlankQuestion,
  MatchingQuestion,
  MultipleChoiceQuestion,
  OrderingQuestion,
  QuestionBlock,
  QuestionResult,
  QuizSchema,
  ScoreResult,
  StudentAnswer,
  StudentAnswers,
  TrueFalseQuestion,
} from './types';

// ─── Score Calculator ────────────────────────────────────────────────────────

export function calculateScore(
  answers: StudentAnswers,
  schema: QuizSchema
): ScoreResult {
  const pointsPerQuestion = schema.scoring.pointsPerQuestion;
  const questionResults: QuestionResult[] = [];

  for (let i = 0; i < schema.questions.length; i++) {
    const question = schema.questions[i];
    const answer = answers.get(i);
    const isCorrect = answer ? isAnswerCorrect(question, answer) : false;

    questionResults.push({
      questionIndex: i,
      isCorrect,
      earnedPoints: isCorrect ? pointsPerQuestion : 0,
      maxPoints: pointsPerQuestion,
    });
  }

  const totalPoints = schema.questions.length * pointsPerQuestion;
  const earnedPoints = questionResults.reduce(
    (sum, r) => sum + r.earnedPoints,
    0
  );
  const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

  return {
    totalPoints,
    earnedPoints,
    percentage,
    questionResults,
  };
}

// ─── Answer Correctness Check ────────────────────────────────────────────────

function isAnswerCorrect(
  question: QuestionBlock,
  answer: StudentAnswer
): boolean {
  switch (question.type) {
    case 'multiple-choice':
      return isMultipleChoiceCorrect(question, answer);
    case 'true-false':
      return isTrueFalseCorrect(question, answer);
    case 'fill-in-the-blank':
      return isFillInTheBlankCorrect(question, answer);
    case 'matching':
      return isMatchingCorrect(question, answer);
    case 'ordering':
      return isOrderingCorrect(question, answer);
    case 'flashcard':
      return true; // Flashcards are not scored
    case 'essay':
      return true; // Essays are scored by AI, not by the automatic scorer
    case 'drag-and-drop':
      return isDragAndDropCorrect(question, answer);
    case 'timed-challenge':
      return isAnswerCorrect(question.innerQuestion, answer);
    default:
      return false;
  }
}

function isMultipleChoiceCorrect(
  question: MultipleChoiceQuestion,
  answer: StudentAnswer
): boolean {
  if (answer.type !== 'multiple-choice') return false;
  const correctOption = question.options.find((o) => o.isCorrect);
  return correctOption?.id === answer.selectedOptionId;
}

function isTrueFalseCorrect(
  question: TrueFalseQuestion,
  answer: StudentAnswer
): boolean {
  if (answer.type !== 'true-false') return false;
  return question.correctAnswer === answer.selectedAnswer;
}

function isFillInTheBlankCorrect(
  question: FillInTheBlankQuestion,
  answer: StudentAnswer
): boolean {
  if (answer.type !== 'fill-in-the-blank') return false;
  return question.blanks.every((blank) => {
    const studentValue = answer.filledBlanks[blank.id];
    if (!studentValue) return false;
    return blank.acceptableAnswers.some(
      (acceptable) =>
        acceptable.toLowerCase().trim() === studentValue.toLowerCase().trim()
    );
  });
}

function isMatchingCorrect(
  question: MatchingQuestion,
  answer: StudentAnswer
): boolean {
  if (answer.type !== 'matching') return false;
  if (answer.pairs.length !== question.correctPairs.length) return false;
  return question.correctPairs.every((cp) =>
    answer.pairs.some((p) => p.leftId === cp.leftId && p.rightId === cp.rightId)
  );
}

function isOrderingCorrect(
  question: OrderingQuestion,
  answer: StudentAnswer
): boolean {
  if (answer.type !== 'ordering') return false;
  if (answer.orderedItemIds.length !== question.correctOrder.length)
    return false;
  return question.correctOrder.every(
    (id, index) => answer.orderedItemIds[index] === id
  );
}

function isDragAndDropCorrect(
  question: DragAndDropQuestion,
  answer: StudentAnswer
): boolean {
  if (answer.type !== 'drag-and-drop') return false;
  return question.zones.every(
    (zone) => answer.placements[zone.id] === question.correctMapping[zone.id]
  );
}
