/**
 * Property-Based Tests for the Quiz Template Library
 *
 * Uses fast-check to verify invariants across randomly generated inputs.
 * Each property references its design document property number.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { getHandler, getRegisteredTypes } from '@/lib/quiz-template/registry';
import { calculateScore } from '@/lib/quiz-template/scoring';
import { stripQuestionBlock } from '@/lib/quiz-template/strip-answers';
import type {
  DragAndDropQuestion,
  EssayQuestion,
  FillInTheBlankQuestion,
  MatchingQuestion,
  MultipleChoiceQuestion,
  OrderingQuestion,
  QuestionBlock,
  QuizSchema,
  StudentAnswer,
  StudentAnswers,
  TimedChallengeQuestion,
  TrueFalseQuestion,
} from '@/lib/quiz-template/types';

// Ensure handlers are registered
import '@/lib/quiz-template/handlers';

// ─── Arbitraries (Generators) ────────────────────────────────────────────────

const arbNonEmptyString = fc.string({ minLength: 1, maxLength: 50 });

const arbMultipleChoice: fc.Arbitrary<MultipleChoiceQuestion> = fc
  .record({
    prompt: arbNonEmptyString,
    options: fc
      .array(
        fc.record({
          id: fc.uuid(),
          text: arbNonEmptyString,
          isCorrect: fc.boolean(),
        }),
        { minLength: 2, maxLength: 6 }
      )
      .map((opts) => {
        // Ensure exactly one correct option
        const allFalse = opts.map((o) => ({ ...o, isCorrect: false }));
        const idx = Math.floor(Math.random() * allFalse.length);
        allFalse[idx].isCorrect = true;
        return allFalse;
      }),
    explanation: fc.option(arbNonEmptyString, { nil: undefined }),
  })
  .map((r) => ({ type: 'multiple_choice' as const, ...r }));

const arbTrueFalse: fc.Arbitrary<TrueFalseQuestion> = fc
  .record({
    prompt: arbNonEmptyString,
    correctAnswer: fc.boolean(),
    explanation: fc.option(arbNonEmptyString, { nil: undefined }),
  })
  .map((r) => ({ type: 'true_false' as const, ...r }));

const arbFillInTheBlank: fc.Arbitrary<FillInTheBlankQuestion> = fc
  .record({
    promptTemplate: arbNonEmptyString,
    blanks: fc.array(
      fc.record({
        id: fc.uuid(),
        acceptableAnswers: fc.array(arbNonEmptyString, {
          minLength: 1,
          maxLength: 3,
        }),
      }),
      { minLength: 1, maxLength: 4 }
    ),
    explanation: fc.option(arbNonEmptyString, { nil: undefined }),
  })
  .map((r) => ({ type: 'fill_in_the_blank' as const, ...r }));

const arbMatching: fc.Arbitrary<MatchingQuestion> = fc
  .integer({ min: 2, max: 5 })
  .chain((n) =>
    fc
      .record({
        prompt: arbNonEmptyString,
        leftItems: fc.array(
          fc.record({ id: fc.uuid(), text: arbNonEmptyString }),
          { minLength: n, maxLength: n }
        ),
        rightItems: fc.array(
          fc.record({ id: fc.uuid(), text: arbNonEmptyString }),
          { minLength: n, maxLength: n }
        ),
        explanation: fc.option(arbNonEmptyString, { nil: undefined }),
      })
      .map((r) => ({
        type: 'matching' as const,
        ...r,
        correctPairs: r.leftItems.map((l, i) => ({
          leftId: l.id,
          rightId: r.rightItems[i].id,
        })),
      }))
  );

const arbOrdering: fc.Arbitrary<OrderingQuestion> = fc
  .record({
    prompt: arbNonEmptyString,
    items: fc.array(fc.record({ id: fc.uuid(), text: arbNonEmptyString }), {
      minLength: 2,
      maxLength: 6,
    }),
    explanation: fc.option(arbNonEmptyString, { nil: undefined }),
  })
  .map((r) => ({
    type: 'ordering' as const,
    ...r,
    correctOrder: r.items.map((i) => i.id),
  }));

const arbDragAndDrop: fc.Arbitrary<DragAndDropQuestion> = fc
  .integer({ min: 1, max: 4 })
  .chain((n) =>
    fc
      .record({
        prompt: arbNonEmptyString,
        sentenceTemplate: arbNonEmptyString,
        zones: fc.array(
          fc.record({ id: fc.uuid(), label: arbNonEmptyString }),
          { minLength: n, maxLength: n }
        ),
        items: fc.array(fc.record({ id: fc.uuid(), text: arbNonEmptyString }), {
          minLength: n,
          maxLength: n + 2,
        }),
        explanation: fc.option(arbNonEmptyString, { nil: undefined }),
      })
      .map((r) => {
        const correctMapping: Record<string, string> = {};
        r.zones.forEach((zone, i) => {
          correctMapping[zone.id] = r.items[i % r.items.length].id;
        });
        return {
          type: 'drag-and-drop' as const,
          ...r,
          correctMapping,
        };
      })
  );

const arbEssay: fc.Arbitrary<EssayQuestion> = fc
  .record({
    prompt: arbNonEmptyString,
    minWords: fc.option(fc.integer({ min: 10, max: 100 }), { nil: undefined }),
    maxWords: fc.option(fc.integer({ min: 100, max: 1000 }), {
      nil: undefined,
    }),
    allowAttachments: fc.option(fc.boolean(), { nil: undefined }),
    deliveryOption: fc.option(
      fc.constantFrom('immediate' as const, 'teacher-review' as const),
      { nil: undefined }
    ),
    allowTeacherRubric: fc.option(fc.boolean(), { nil: undefined }),
    explanation: fc.option(arbNonEmptyString, { nil: undefined }),
  })
  .map((r) => ({ type: 'essay' as const, ...r }));

// For timed-challenge, use a non-timed inner question to avoid recursion
const arbInnerQuestion: fc.Arbitrary<
  Exclude<QuestionBlock, TimedChallengeQuestion>
> = fc.oneof(
  arbMultipleChoice,
  arbTrueFalse,
  arbFillInTheBlank,
  arbMatching,
  arbOrdering,
  arbDragAndDrop,
  arbEssay
);

const arbTimedChallenge: fc.Arbitrary<TimedChallengeQuestion> =
  arbInnerQuestion.chain((inner) =>
    fc
      .record({
        prompt: arbNonEmptyString,
        timeLimitSeconds: fc.integer({ min: 10, max: 300 }),
        explanation: fc.option(arbNonEmptyString, { nil: undefined }),
      })
      .map((r) => ({
        type: 'timed-challenge' as const,
        innerQuestion: inner,
        ...r,
      }))
  );

const arbQuestionBlock: fc.Arbitrary<QuestionBlock> = fc.oneof(
  arbMultipleChoice,
  arbTrueFalse,
  arbFillInTheBlank,
  arbMatching,
  arbOrdering,
  arbDragAndDrop,
  arbEssay,
  arbTimedChallenge
);

// ─── Property 1: Answer stripping removes all answer fields ──────────────────
// **Validates: Requirements 1.3, 1.5, 7.3**

describe('Property 1: Answer stripping removes all answer fields', () => {
  const ANSWER_FIELDS = [
    'isCorrect',
    'correctAnswer',
    'acceptableAnswers',
    'correctPairs',
    'correctOrder',
    'correctMapping',
  ];

  function deepCheckNoAnswerFields(obj: unknown, path = ''): string[] {
    const violations: string[] = [];
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return violations;
    }
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => {
        violations.push(...deepCheckNoAnswerFields(item, `${path}[${i}]`));
      });
    } else {
      for (const [key, value] of Object.entries(
        obj as Record<string, unknown>
      )) {
        if (ANSWER_FIELDS.includes(key)) {
          violations.push(`${path}.${key}`);
        }
        violations.push(...deepCheckNoAnswerFields(value, `${path}.${key}`));
      }
    }
    return violations;
  }

  it('stripped question has no answer fields for any QuestionBlock', () => {
    fc.assert(
      fc.property(arbQuestionBlock, (question) => {
        const stripped = stripQuestionBlock(question);
        const violations = deepCheckNoAnswerFields(stripped);
        expect(violations).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });

  it('stripped question preserves the type field', () => {
    fc.assert(
      fc.property(arbQuestionBlock, (question) => {
        const stripped = stripQuestionBlock(question);
        expect(stripped.type).toBe(question.type);
      }),
      { numRuns: 100 }
    );
  });

  it('stripped question preserves prompt/promptTemplate', () => {
    fc.assert(
      fc.property(arbQuestionBlock, (question) => {
        const stripped = stripQuestionBlock(question);
        if ('prompt' in question && 'prompt' in stripped) {
          expect(stripped.prompt).toBe(question.prompt);
        }
        if ('promptTemplate' in question && 'promptTemplate' in stripped) {
          expect(stripped.promptTemplate).toBe(question.promptTemplate);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 2: Registry completeness ───────────────────────────────────────
// **Validates: Requirements 7.1, 7.2**

describe('Property 2: Registry returns valid handler for all registered type strings', () => {
  it('getHandler returns a handler with score and stripAnswers for every registered type', () => {
    const registeredTypes = getRegisteredTypes();
    expect(registeredTypes.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(fc.constantFrom(...registeredTypes), (type) => {
        const handler = getHandler(type);
        expect(handler).toBeDefined();
        expect(handler.type).toBe(type);
        expect(typeof handler.score).toBe('function');
        expect(typeof handler.stripAnswers).toBe('function');
      }),
      { numRuns: 100 }
    );
  });

  it('getHandler does not throw for any registered type', () => {
    const registeredTypes = getRegisteredTypes();

    fc.assert(
      fc.property(fc.constantFrom(...registeredTypes), (type) => {
        expect(() => getHandler(type)).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  it('getHandler resolves snake_case aliases to registered hyphenated types', () => {
    const handler = getHandler('multiple_choice');

    expect(handler.type).toBe('multiple-choice');
  });
});

// ─── Property 3: Quiz navigation index stays in bounds ───────────────────────
// **Validates: Requirements 2.4**

describe('Property 3: Quiz navigation index stays in bounds for any sequence of next/prev calls', () => {
  // Pure function equivalent of useQuizNavigation logic
  function simulateNavigation(
    totalQuestions: number,
    actions: ('next' | 'prev')[]
  ): number[] {
    let currentIndex = 0;
    const indices: number[] = [currentIndex];

    for (const action of actions) {
      if (action === 'next') {
        currentIndex = Math.min(currentIndex + 1, totalQuestions - 1);
      } else {
        currentIndex = Math.max(currentIndex - 1, 0);
      }
      indices.push(currentIndex);
    }

    return indices;
  }

  it('currentIndex stays in [0, totalQuestions) for any action sequence', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.constantFrom('next' as const, 'prev' as const), {
          minLength: 1,
          maxLength: 50,
        }),
        (totalQuestions, actions) => {
          const indices = simulateNavigation(totalQuestions, actions);
          for (const idx of indices) {
            expect(idx).toBeGreaterThanOrEqual(0);
            expect(idx).toBeLessThan(totalQuestions);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('next never exceeds totalQuestions - 1', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (totalQuestions) => {
        // Call next many more times than totalQuestions
        const actions = Array.from(
          { length: totalQuestions + 10 },
          () => 'next' as const
        );
        const indices = simulateNavigation(totalQuestions, actions);
        const lastIndex = indices[indices.length - 1];
        expect(lastIndex).toBe(totalQuestions - 1);
      }),
      { numRuns: 100 }
    );
  });

  it('prev never goes below 0', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (totalQuestions) => {
        // Call prev many times from start
        const actions = Array.from({ length: 20 }, () => 'prev' as const);
        const indices = simulateNavigation(totalQuestions, actions);
        for (const idx of indices) {
          expect(idx).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 4: Quiz reducer produces valid state ───────────────────────────
// **Validates: Requirements 2.6**

describe('Property 4: Quiz reducer produces valid state for any state + action pair', () => {
  // Pure reducer function (mirrors use-quiz-reducer.ts logic)
  type QuizPhase = 'idle' | 'in-progress' | 'completed';

  interface QuizState {
    phase: QuizPhase;
    currentIndex: number;
    answers: Map<number, StudentAnswer>;
    result: {
      totalPoints: number;
      earnedPoints: number;
      percentage: number;
    } | null;
    isSubmitting: boolean;
    error: string | null;
    answerRevealed: boolean;
    instantResults: Map<number, boolean | null>;
  }

  type QuizAction =
    | { type: 'START' }
    | { type: 'ANSWER'; index: number; answer: StudentAnswer }
    | { type: 'NEXT' }
    | { type: 'PREVIOUS' }
    | { type: 'SUBMIT_START' }
    | {
        type: 'SUBMIT_SUCCESS';
        result: {
          totalPoints: number;
          earnedPoints: number;
          percentage: number;
        };
      }
    | { type: 'SUBMIT_ERROR'; error: string }
    | { type: 'REVEAL_ANSWER'; index: number; isCorrect: boolean }
    | { type: 'RETRY' };

  function createInitialState(): QuizState {
    return {
      phase: 'idle',
      currentIndex: 0,
      answers: new Map(),
      result: null,
      isSubmitting: false,
      error: null,
      answerRevealed: false,
      instantResults: new Map(),
    };
  }

  function quizReducer(state: QuizState, action: QuizAction): QuizState {
    switch (action.type) {
      case 'START':
        return { ...createInitialState(), phase: 'in-progress' };
      case 'ANSWER': {
        if (state.answerRevealed) return state;
        const nextAnswers = new Map(state.answers);
        nextAnswers.set(action.index, action.answer);
        return { ...state, answers: nextAnswers };
      }
      case 'NEXT':
        return {
          ...state,
          currentIndex: state.currentIndex + 1,
          answerRevealed: false,
        };
      case 'PREVIOUS': {
        const prevIndex = Math.max(0, state.currentIndex - 1);
        return {
          ...state,
          currentIndex: prevIndex,
          answerRevealed: state.instantResults.has(prevIndex),
        };
      }
      case 'SUBMIT_START':
        return { ...state, isSubmitting: true, error: null };
      case 'SUBMIT_SUCCESS':
        return {
          ...state,
          isSubmitting: false,
          phase: 'completed',
          result: action.result,
        };
      case 'SUBMIT_ERROR':
        return { ...state, isSubmitting: false, error: action.error };
      case 'REVEAL_ANSWER': {
        const nextInstantResults = new Map(state.instantResults);
        nextInstantResults.set(action.index, action.isCorrect);
        return {
          ...state,
          answerRevealed: true,
          instantResults: nextInstantResults,
        };
      }
      case 'RETRY':
        return { ...createInitialState(), phase: 'in-progress' };
      default:
        return state;
    }
  }

  const arbAnswer: fc.Arbitrary<StudentAnswer> = fc.oneof(
    fc.record({
      type: fc.constant('multiple-choice' as const),
      selectedOptionId: fc.uuid(),
    }),
    fc.record({
      type: fc.constant('true-false' as const),
      selectedAnswer: fc.boolean(),
    }),
    fc.record({ type: fc.constant('essay' as const), text: arbNonEmptyString })
  );

  const arbAction: fc.Arbitrary<QuizAction> = fc.oneof(
    fc.constant({ type: 'START' as const }),
    fc.record({
      type: fc.constant('ANSWER' as const),
      index: fc.nat({ max: 20 }),
      answer: arbAnswer,
    }),
    fc.constant({ type: 'NEXT' as const }),
    fc.constant({ type: 'PREVIOUS' as const }),
    fc.constant({ type: 'SUBMIT_START' as const }),
    fc.record({
      type: fc.constant('SUBMIT_SUCCESS' as const),
      result: fc.record({
        totalPoints: fc.nat({ max: 100 }),
        earnedPoints: fc.nat({ max: 100 }),
        percentage: fc.float({ min: 0, max: 100, noNaN: true }),
      }),
    }),
    fc.record({
      type: fc.constant('SUBMIT_ERROR' as const),
      error: arbNonEmptyString,
    }),
    fc.record({
      type: fc.constant('REVEAL_ANSWER' as const),
      index: fc.nat({ max: 20 }),
      isCorrect: fc.boolean(),
    }),
    fc.constant({ type: 'RETRY' as const })
  );

  it('reducer always produces a valid phase', () => {
    fc.assert(
      fc.property(
        fc.array(arbAction, { minLength: 1, maxLength: 20 }),
        (actions) => {
          let state = createInitialState();
          for (const action of actions) {
            state = quizReducer(state, action);
          }
          expect(['idle', 'in-progress', 'completed']).toContain(state.phase);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('reducer currentIndex is never negative', () => {
    fc.assert(
      fc.property(
        fc.array(arbAction, { minLength: 1, maxLength: 20 }),
        (actions) => {
          let state = createInitialState();
          for (const action of actions) {
            state = quizReducer(state, action);
          }
          expect(state.currentIndex).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when phase is completed, result is present', () => {
    fc.assert(
      fc.property(
        fc.array(arbAction, { minLength: 1, maxLength: 30 }),
        (actions) => {
          let state = createInitialState();
          for (const action of actions) {
            state = quizReducer(state, action);
          }
          if (state.phase === 'completed') {
            expect(state.result).not.toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 5: Scoring engine produces bounded results ─────────────────────
// **Validates: Requirements 4.1**

describe('Property 5: Scoring engine produces bounded results for any questions + answers', () => {
  it('0 <= earnedPoints <= totalPoints and 0 <= percentage <= 100', () => {
    fc.assert(
      fc.property(
        fc.array(arbQuestionBlock, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (questions, pointsPerQuestion) => {
          // Build answers map — may be partial or empty
          const answers: StudentAnswers = new Map();

          const schema: QuizSchema = {
            type: 'quiz',
            constraints: { minQuestions: 1, maxQuestions: questions.length },
            scoring: { pointsPerQuestion },
            questions,
          };

          const result = calculateScore(answers, schema);

          expect(result.earnedPoints).toBeGreaterThanOrEqual(0);
          expect(result.earnedPoints).toBeLessThanOrEqual(result.totalPoints);
          expect(result.percentage).toBeGreaterThanOrEqual(0);
          expect(result.percentage).toBeLessThanOrEqual(100);
          expect(result.questionResults.length).toBe(questions.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('scoring with correct answers produces bounded results', () => {
    fc.assert(
      fc.property(
        arbMultipleChoice,
        fc.integer({ min: 1, max: 10 }),
        (question, pointsPerQuestion) => {
          const correctOption = question.options.find((o) => o.isCorrect);
          const answers: StudentAnswers = new Map();
          if (correctOption) {
            answers.set(0, {
              type: 'multiple-choice',
              selectedOptionId: correctOption.id,
            });
          }

          const schema: QuizSchema = {
            type: 'quiz',
            constraints: { minQuestions: 1, maxQuestions: 1 },
            scoring: { pointsPerQuestion },
            questions: [question],
          };

          const result = calculateScore(answers, schema);

          expect(result.earnedPoints).toBeGreaterThanOrEqual(0);
          expect(result.earnedPoints).toBeLessThanOrEqual(result.totalPoints);
          expect(result.percentage).toBeGreaterThanOrEqual(0);
          expect(result.percentage).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty answers produce 0 earned points (except essays which are pendingReview)', () => {
    fc.assert(
      fc.property(
        fc.array(arbQuestionBlock, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 10 }),
        (questions, pointsPerQuestion) => {
          const answers: StudentAnswers = new Map(); // empty

          const schema: QuizSchema = {
            type: 'quiz',
            constraints: { minQuestions: 1, maxQuestions: questions.length },
            scoring: { pointsPerQuestion },
            questions,
          };

          const result = calculateScore(answers, schema);

          // With no answers, earnedPoints should be 0
          expect(result.earnedPoints).toBe(0);
          expect(result.percentage).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 6: Quiz form validation correctness ────────────────────────────
// **Validates: Requirements 5.4**

describe('Property 6: Quiz form validation correctness for any form state', () => {
  // Pure validation function (mirrors use-quiz-validation.ts logic without React/i18n)
  interface QuizFormState {
    title: string;
    description: string;
    category: string;
    subType: string;
    deliveryMode: string;
    selectionMethod: string;
    questionCount: string;
    contentSource: 'specific-lessons' | 'all-modules';
    selectedLessonIds: string[];
  }

  function validateForm(
    formState: QuizFormState,
    matchingQuestionCount: number
  ): Record<string, string> {
    const errors: Record<string, string> = {};

    if (
      formState.contentSource === 'specific-lessons' &&
      formState.selectedLessonIds.length === 0
    ) {
      errors.lesson = 'Lesson required';
    }
    if (!formState.title.trim()) {
      errors.title = 'Title required';
    }
    if (!formState.category) {
      errors.category = 'Category required';
    }
    if (!formState.subType) {
      errors.subType = 'Sub-type required';
    }

    const count = Number.parseInt(formState.questionCount, 10) || 0;
    if (count < 1) {
      errors.questionCount = 'Question count min';
    }
    if (
      formState.selectionMethod === 'HAND_PICK' &&
      matchingQuestionCount < count
    ) {
      errors.questionCount = 'Insufficient questions';
    }

    return errors;
  }

  const arbFormState: fc.Arbitrary<QuizFormState> = fc.record({
    title: fc.oneof(fc.constant(''), fc.constant('   '), arbNonEmptyString),
    description: fc.string(),
    category: fc.oneof(
      fc.constant(''),
      fc.constant('SELECTION_BASED'),
      fc.constant('OPEN_ENDED')
    ),
    subType: fc.oneof(
      fc.constant(''),
      fc.constant('MULTIPLE_CHOICE'),
      fc.constant('TRUE_FALSE'),
      fc.constant('ESSAY')
    ),
    deliveryMode: fc.constantFrom('INSTANT_FEEDBACK', 'POST_QUIZ_REVIEW'),
    selectionMethod: fc.constantFrom('HAND_PICK', 'RANDOM', 'MANUAL_CREATE'),
    questionCount: fc.oneof(
      fc.constant('0'),
      fc.constant('-1'),
      fc.constant('5'),
      fc.constant('abc'),
      fc.integer({ min: 1, max: 50 }).map(String)
    ),
    contentSource: fc.constantFrom(
      'specific-lessons' as const,
      'all-modules' as const
    ),
    selectedLessonIds: fc.oneof(
      fc.constant([] as string[]),
      fc.array(fc.uuid(), { minLength: 1, maxLength: 5 })
    ),
  });

  it('returns title error when title is empty/whitespace', () => {
    fc.assert(
      fc.property(arbFormState, (formState) => {
        const errors = validateForm(formState, 100);
        if (!formState.title.trim()) {
          expect(errors.title).toBeDefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('returns category error when category is unset', () => {
    fc.assert(
      fc.property(arbFormState, (formState) => {
        const errors = validateForm(formState, 100);
        if (!formState.category) {
          expect(errors.category).toBeDefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('returns questionCount error when count < 1', () => {
    fc.assert(
      fc.property(arbFormState, (formState) => {
        const errors = validateForm(formState, 100);
        const count = Number.parseInt(formState.questionCount, 10) || 0;
        if (count < 1) {
          expect(errors.questionCount).toBeDefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('returns no errors when all required fields are valid', () => {
    // Title must be non-empty after trimming to pass validation
    const arbNonBlankTitle = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0);

    const validFormState: fc.Arbitrary<QuizFormState> = fc.record({
      title: arbNonBlankTitle,
      description: fc.string(),
      category: fc.constantFrom('SELECTION_BASED', 'OPEN_ENDED'),
      subType: fc.constantFrom('MULTIPLE_CHOICE', 'TRUE_FALSE', 'ESSAY'),
      deliveryMode: fc.constantFrom('INSTANT_FEEDBACK', 'POST_QUIZ_REVIEW'),
      selectionMethod: fc.constantFrom('RANDOM', 'MANUAL_CREATE'),
      questionCount: fc.integer({ min: 1, max: 50 }).map(String),
      contentSource: fc.constant('all-modules' as const),
      selectedLessonIds: fc.constant([] as string[]),
    });

    fc.assert(
      fc.property(validFormState, (formState) => {
        const errors = validateForm(formState, 100);
        expect(Object.keys(errors).length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 7: Course navigation returns correct prev/next ─────────────────
// **Validates: Requirements 9.1, 9.2**

describe('Property 7: Course navigation returns correct prev/next for any module structure', () => {
  // Pure function equivalent of useCourseNavigation logic
  interface NavItem {
    type: 'lesson' | 'quiz';
    id: string;
    title: string;
    href: string;
  }

  interface ModuleWithLessons {
    id: string;
    lessons: { id: string; title: string }[];
  }

  interface QuizWithLesson {
    id: string;
    title: string;
    lessonId: string;
  }

  function computeNavigation(
    courseId: string,
    currentItemId: string,
    currentItemType: 'lesson' | 'quiz',
    modules: ModuleWithLessons[],
    quizzes: QuizWithLesson[]
  ): { prev: NavItem | null; next: NavItem | null; allItems: NavItem[] } {
    if (!modules.length) {
      return { prev: null, next: null, allItems: [] };
    }

    const allItems: NavItem[] = [];
    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        allItems.push({
          type: 'lesson',
          id: lesson.id,
          title: lesson.title,
          href: `/courses/${courseId}/lessons/${lesson.id}`,
        });
        const lessonQuizzes = quizzes.filter((q) => q.lessonId === lesson.id);
        for (const lq of lessonQuizzes) {
          allItems.push({
            type: 'quiz',
            id: lq.id,
            title: lq.title,
            href: `/courses/${courseId}/quiz/${lq.id}`,
          });
        }
      }
    }

    const currentIdx = allItems.findIndex(
      (item) => item.type === currentItemType && item.id === currentItemId
    );

    if (currentIdx === -1) {
      return { prev: null, next: null, allItems };
    }

    return {
      prev: currentIdx > 0 ? allItems[currentIdx - 1] : null,
      next: currentIdx < allItems.length - 1 ? allItems[currentIdx + 1] : null,
      allItems,
    };
  }

  const arbModule: fc.Arbitrary<ModuleWithLessons> = fc.record({
    id: fc.uuid(),
    lessons: fc.array(fc.record({ id: fc.uuid(), title: arbNonEmptyString }), {
      minLength: 1,
      maxLength: 4,
    }),
  });

  it('prev is null when current item is first, next is null when last', () => {
    fc.assert(
      fc.property(
        fc.array(arbModule, { minLength: 1, maxLength: 3 }),
        fc.uuid(),
        (modules, courseId) => {
          // Pick the first lesson as current
          const firstLesson = modules[0].lessons[0];
          const result = computeNavigation(
            courseId,
            firstLesson.id,
            'lesson',
            modules,
            []
          );

          expect(result.prev).toBeNull();

          // Pick the last item
          if (result.allItems.length > 0) {
            const lastItem = result.allItems[result.allItems.length - 1];
            const lastResult = computeNavigation(
              courseId,
              lastItem.id,
              lastItem.type,
              modules,
              []
            );
            expect(lastResult.next).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('prev/next are adjacent items in the flat list', () => {
    fc.assert(
      fc.property(
        fc.array(arbModule, { minLength: 1, maxLength: 3 }),
        fc.uuid(),
        (modules, courseId) => {
          const quizzes: QuizWithLesson[] = [];
          // Add a quiz for the first lesson
          if (modules[0].lessons.length > 0) {
            quizzes.push({
              id: 'quiz-test-1',
              title: 'Test Quiz',
              lessonId: modules[0].lessons[0].id,
            });
          }

          const result = computeNavigation(
            courseId,
            modules[0].lessons[0].id,
            'lesson',
            modules,
            quizzes
          );

          if (result.allItems.length > 1) {
            // First item should have next = second item
            expect(result.next).toEqual(result.allItems[1]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('allItems contains all lessons and quizzes in module order', () => {
    fc.assert(
      fc.property(
        fc.array(arbModule, { minLength: 1, maxLength: 3 }),
        fc.uuid(),
        (modules, courseId) => {
          const result = computeNavigation(
            courseId,
            'nonexistent',
            'lesson',
            modules,
            []
          );

          // Count total lessons across all modules
          const totalLessons = modules.reduce(
            (sum, m) => sum + m.lessons.length,
            0
          );
          expect(result.allItems.length).toBe(totalLessons);

          // Verify all lessons are present
          const allLessonIds = modules.flatMap((m) =>
            m.lessons.map((l) => l.id)
          );
          const navLessonIds = result.allItems.map((i) => i.id);
          for (const id of allLessonIds) {
            expect(navLessonIds).toContain(id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 8: Module accordion order preservation on external changes ─────
// **Validates: Requirements 8.4**

describe('Property 8: Module accordion order preservation on external changes', () => {
  // Pure function equivalent of buildItemList logic
  interface SimpleItem {
    id: string;
    title: string;
  }

  function buildOrderedList(
    items: SimpleItem[],
    savedOrder: Map<string, number> | null
  ): SimpleItem[] {
    const list = [...items];
    if (savedOrder && savedOrder.size > 0) {
      list.sort((a, b) => {
        const orderA = savedOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const orderB = savedOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
    }
    return list;
  }

  it('relative order of preserved items is maintained after additions', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ id: fc.uuid(), title: arbNonEmptyString }), {
          minLength: 2,
          maxLength: 8,
        }),
        fc.array(fc.record({ id: fc.uuid(), title: arbNonEmptyString }), {
          minLength: 1,
          maxLength: 3,
        }),
        (originalItems, newItems) => {
          // Create a saved order from original items
          const savedOrder = new Map<string, number>();
          originalItems.forEach((item, idx) => {
            savedOrder.set(item.id, idx);
          });

          // Add new items to the list
          const combinedItems = [...originalItems, ...newItems];
          const result = buildOrderedList(combinedItems, savedOrder);

          // Verify relative order of original items is preserved
          const originalIdsInResult = result
            .filter((item) => originalItems.some((o) => o.id === item.id))
            .map((item) => item.id);

          const originalIdsOrdered = originalItems.map((i) => i.id);

          // The relative order should match
          expect(originalIdsInResult).toEqual(originalIdsOrdered);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('relative order of preserved items is maintained after removals', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ id: fc.uuid(), title: arbNonEmptyString }), {
          minLength: 4,
          maxLength: 10,
        }),
        fc.integer({ min: 1, max: 3 }),
        (originalItems, removeCount) => {
          // Create a saved order from original items
          const savedOrder = new Map<string, number>();
          originalItems.forEach((item, idx) => {
            savedOrder.set(item.id, idx);
          });

          // Remove some items
          const actualRemoveCount = Math.min(
            removeCount,
            originalItems.length - 1
          );
          const remainingItems = originalItems.slice(actualRemoveCount);
          const result = buildOrderedList(remainingItems, savedOrder);

          // Verify relative order of remaining items is preserved
          const resultIds = result.map((i) => i.id);
          const expectedOrder = remainingItems
            .slice()
            .sort((a, b) => {
              const orderA = savedOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
              const orderB = savedOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
              return orderA - orderB;
            })
            .map((i) => i.id);

          expect(resultIds).toEqual(expectedOrder);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('new items without saved order appear after ordered items', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ id: fc.uuid(), title: arbNonEmptyString }), {
          minLength: 2,
          maxLength: 5,
        }),
        fc.array(fc.record({ id: fc.uuid(), title: arbNonEmptyString }), {
          minLength: 1,
          maxLength: 3,
        }),
        (originalItems, newItems) => {
          const savedOrder = new Map<string, number>();
          originalItems.forEach((item, idx) => {
            savedOrder.set(item.id, idx);
          });

          const combinedItems = [...originalItems, ...newItems];
          const result = buildOrderedList(combinedItems, savedOrder);

          // New items (without saved order) should appear after all ordered items
          const lastOrderedIdx = result.findLastIndex((item) =>
            savedOrder.has(item.id)
          );
          const firstNewIdx = result.findIndex(
            (item) => !savedOrder.has(item.id)
          );

          if (firstNewIdx !== -1 && lastOrderedIdx !== -1) {
            expect(firstNewIdx).toBeGreaterThan(lastOrderedIdx);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 9: Connecting lines endpoint correctness ───────────────────────
// **Validates: Requirements 13.1**

describe('Property 9: Connecting lines endpoint correctness for any rect positions', () => {
  // Pure function equivalent of the line calculation logic from useConnectingLines
  interface Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  }

  interface MatchingPair {
    leftId: string;
    rightId: string;
  }

  interface ConnectingLine {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    leftId: string;
    rightId: string;
  }

  function calculateLines(
    pairs: MatchingPair[],
    leftRects: Map<string, Rect>,
    rightRects: Map<string, Rect>,
    containerRect: Rect
  ): ConnectingLine[] {
    const lines: ConnectingLine[] = [];

    for (const pair of pairs) {
      const leftRect = leftRects.get(pair.leftId);
      const rightRect = rightRects.get(pair.rightId);

      if (leftRect && rightRect) {
        lines.push({
          x1: leftRect.right - containerRect.left,
          y1: leftRect.top + leftRect.height / 2 - containerRect.top,
          x2: rightRect.left - containerRect.left,
          y2: rightRect.top + rightRect.height / 2 - containerRect.top,
          leftId: pair.leftId,
          rightId: pair.rightId,
        });
      }
    }

    return lines;
  }

  const arbRect: fc.Arbitrary<Rect> = fc
    .record({
      left: fc.float({ min: 0, max: 1000, noNaN: true }),
      top: fc.float({ min: 0, max: 1000, noNaN: true }),
      width: fc.float({ min: 10, max: 200, noNaN: true }),
      height: fc.float({ min: 10, max: 100, noNaN: true }),
    })
    .map((r) => ({
      left: r.left,
      top: r.top,
      right: r.left + r.width,
      bottom: r.top + r.height,
      width: r.width,
      height: r.height,
    }));

  it('x1 equals right edge of left item minus container left', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 4 }),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 4 }),
        arbRect,
        fc.array(arbRect, { minLength: 4, maxLength: 4 }),
        fc.array(arbRect, { minLength: 4, maxLength: 4 }),
        (leftIds, rightIds, containerRect, leftRectsArr, rightRectsArr) => {
          const leftRects = new Map<string, Rect>();
          const rightRects = new Map<string, Rect>();

          leftIds.forEach((id, i) => {
            leftRects.set(id, leftRectsArr[i % leftRectsArr.length]);
          });
          rightIds.forEach((id, i) => {
            rightRects.set(id, rightRectsArr[i % rightRectsArr.length]);
          });

          const pairs: MatchingPair[] = leftIds
            .slice(0, Math.min(leftIds.length, rightIds.length))
            .map((leftId, i) => ({
              leftId,
              rightId: rightIds[i % rightIds.length],
            }));

          const lines = calculateLines(
            pairs,
            leftRects,
            rightRects,
            containerRect
          );

          for (const line of lines) {
            const leftRect = leftRects.get(line.leftId)!;
            const rightRect = rightRects.get(line.rightId)!;

            // x1 = right edge of left item - container left
            expect(line.x1).toBeCloseTo(leftRect.right - containerRect.left, 5);
            // y1 = vertical center of left item - container top
            expect(line.y1).toBeCloseTo(
              leftRect.top + leftRect.height / 2 - containerRect.top,
              5
            );
            // x2 = left edge of right item - container left
            expect(line.x2).toBeCloseTo(rightRect.left - containerRect.left, 5);
            // y2 = vertical center of right item - container top
            expect(line.y2).toBeCloseTo(
              rightRect.top + rightRect.height / 2 - containerRect.top,
              5
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('number of lines equals number of pairs with valid rects', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        arbRect,
        (pairCount, containerRect) => {
          const leftIds = Array.from(
            { length: pairCount },
            (_, i) => `left-${i}`
          );
          const rightIds = Array.from(
            { length: pairCount },
            (_, i) => `right-${i}`
          );

          const leftRects = new Map<string, Rect>();
          const rightRects = new Map<string, Rect>();

          // All pairs have valid rects
          for (const id of leftIds) {
            leftRects.set(id, {
              left: 50,
              top: 100,
              right: 150,
              bottom: 140,
              width: 100,
              height: 40,
            });
          }
          for (const id of rightIds) {
            rightRects.set(id, {
              left: 300,
              top: 100,
              right: 400,
              bottom: 140,
              width: 100,
              height: 40,
            });
          }

          const pairs: MatchingPair[] = leftIds.map((leftId, i) => ({
            leftId,
            rightId: rightIds[i],
          }));

          const lines = calculateLines(
            pairs,
            leftRects,
            rightRects,
            containerRect
          );

          expect(lines.length).toBe(pairCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('missing rects produce no line for that pair', () => {
    fc.assert(
      fc.property(arbRect, (containerRect) => {
        const pairs: MatchingPair[] = [
          { leftId: 'exists', rightId: 'missing' },
        ];
        const leftRects = new Map<string, Rect>();
        leftRects.set('exists', {
          left: 50,
          top: 100,
          right: 150,
          bottom: 140,
          width: 100,
          height: 40,
        });
        const rightRects = new Map<string, Rect>(); // empty — missing

        const lines = calculateLines(
          pairs,
          leftRects,
          rightRects,
          containerRect
        );

        expect(lines.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});
