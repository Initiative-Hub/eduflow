import type {
  QuestionBlock,
  QuestionResult,
  QuizSchema,
  ScoreResult,
  StudentAnswer,
  StudentAnswers,
} from './types';

// Ensure all handlers are registered before scoring
import './handlers';
import { getHandler } from './registry';

// ─── Score Calculator ────────────────────────────────────────────────────────

export function calculateScore(
  answers: StudentAnswers,
  schema: QuizSchema
): ScoreResult {
  const pointsPerQuestion = schema.scoring.pointsPerQuestion;
  const questionResults: QuestionResult[] = [];
  let hasPendingReview = false;

  for (let i = 0; i < schema.questions.length; i++) {
    const question = schema.questions[i];
    const answer = answers.get(i);
    const isEssay = question.type === 'essay';

    if (isEssay) {
      // Essays require AI/teacher review — do not auto-score
      hasPendingReview = true;
      questionResults.push({
        questionIndex: i,
        isCorrect: false,
        earnedPoints: 0,
        maxPoints: pointsPerQuestion,
        pendingReview: true,
      });
    } else {
      const isCorrect = answer ? isAnswerCorrect(question, answer) : false;
      questionResults.push({
        questionIndex: i,
        isCorrect,
        earnedPoints: isCorrect ? pointsPerQuestion : 0,
        maxPoints: pointsPerQuestion,
      });
    }
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
    ...(hasPendingReview && { hasPendingReview: true }),
  };
}

// ─── Answer Correctness Check ────────────────────────────────────────────────

function isAnswerCorrect(
  question: QuestionBlock,
  answer: StudentAnswer
): boolean {
  const handler = getHandler(question.type);
  return handler.score(question, answer);
}
