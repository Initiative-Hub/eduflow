/**
 * Question Type Registry
 *
 * Provides an extensible registry pattern for question type handlers.
 * Each handler encapsulates scoring, answer-stripping, and (optionally)
 * rendering logic for a specific question type.
 *
 * Adding a new question type requires only registering a new handler here —
 * no modifications to scoring.ts, strip-answers.ts, or renderers needed.
 */

import type {
  ClientQuestionBlock,
  QuestionBlock,
  StudentAnswer,
} from './types';

// ─── Component Props Interface ───────────────────────────────────────────────

/**
 * Uniform props interface for question renderer components.
 * Both quiz-taking and review components receive the same shape.
 */
export interface QuestionRendererProps {
  /** The question data (may be client-safe or display-safe depending on context) */
  question: any;
  /** The student's current answer, if any */
  answer?: StudentAnswer;
  /** Callback when the student provides/updates an answer */
  onAnswer: (answer: StudentAnswer) => void;
  /** Whether to show correct/incorrect result indicators */
  showResult: boolean;
  /** Whether the component is disabled (read-only) */
  disabled?: boolean;
}

// ─── Handler Interface ───────────────────────────────────────────────────────

export interface QuestionTypeHandler {
  /** The question type discriminator string */
  type: string;
  /** Scores a student answer against the question, returning true if correct */
  score: (question: QuestionBlock, answer: StudentAnswer) => boolean;
  /** Strips answer/correctness data from a question for client-safe delivery */
  stripAnswers: (question: QuestionBlock) => ClientQuestionBlock;
  /** React component for quiz-taking mode */
  component?: React.ComponentType<QuestionRendererProps>;
  /** React component for review/read-only mode */
  reviewComponent?: React.ComponentType<QuestionRendererProps>;
}

// ─── Registry ────────────────────────────────────────────────────────────────

const registry = new Map<string, QuestionTypeHandler>();

/**
 * Registers a question type handler in the registry.
 * TypeScript enforces that all required fields (type, score, stripAnswers)
 * are present at compile time.
 */
export function registerQuestionType(handler: QuestionTypeHandler): void {
  registry.set(handler.type, handler);
}

/**
 * Retrieves the handler for a given question type.
 * @throws Error if no handler is registered for the given type.
 */
export function getHandler(type: string): QuestionTypeHandler {
  const handler = registry.get(type);
  if (!handler) {
    throw new Error(
      `No handler registered for question type: "${type}". ` +
        `Registered types: ${[...registry.keys()].join(', ')}`
    );
  }
  return handler;
}

/**
 * Returns all registered question type strings.
 * Useful for validation and testing.
 */
export function getRegisteredTypes(): string[] {
  return [...registry.keys()];
}
