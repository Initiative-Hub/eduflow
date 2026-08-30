import type { GameQuizWithQuestions } from './types';

export function projectGameQuizDefinition(quiz: GameQuizWithQuestions) {
  return {
    id: quiz.id,
    title: quiz.title,
    topic: quiz.topic,
    difficulty: quiz.difficulty,
    templateKey: quiz.templateKey,
    randomizeQuestionOrder: quiz.randomizeQuestionOrder,
    randomizeAnswerOrder: quiz.randomizeAnswerOrder,
    revision: quiz.revision,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
    questions: quiz.questions.map((question) => ({
      id: question.id,
      orderIndex: question.orderIndex,
      prompt: question.prompt,
      hint: question.hint,
      explanation: question.explanation,
      timerSeconds: question.timerSeconds,
      maxPoints: question.maxPoints,
      options: question.options.map((option) => ({
        id: option.id,
        orderIndex: option.orderIndex,
        text: option.text,
        isCorrect: option.isCorrect,
      })),
    })),
  };
}
