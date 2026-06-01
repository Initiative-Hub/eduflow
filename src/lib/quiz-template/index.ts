export * from './quiz-schema';
export type { QuestionRendererProps, QuestionTypeHandler } from './registry';
export {
  getHandler,
  getRegisteredTypes,
  registerQuestionType,
} from './registry';
export { calculateScore } from './scoring';
export { stripQuestionBlock, stripQuizAnswers } from './strip-answers';
export * from './types';
