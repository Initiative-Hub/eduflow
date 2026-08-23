import { describe, expect, it } from 'vitest';
import {
  gameQuizAIGeneratedQuestionSchema,
  gameQuizAIGenerationInputSchema,
} from '@/lib/game-quiz/ai-schemas';

const COURSE_ID = '11111111-1111-4111-8111-111111111111';
const LESSON_ID = '22222222-2222-4222-8222-222222222222';

function validInput() {
  return {
    courseId: COURSE_ID,
    lessonIds: [LESSON_ID],
    questionCount: 5,
    additionalPrompt: '  Emphasize practical examples.  ',
    topic: '  Photosynthesis  ',
  };
}

function validQuestion() {
  return {
    prompt: 'Which structure captures light energy?',
    hint: 'Look for the organelle containing chlorophyll.',
    explanation: 'Chloroplasts contain chlorophyll and capture light energy.',
    timerSeconds: 30,
    maxPoints: 1_000,
    options: [
      { text: 'Chloroplast', isCorrect: true },
      { text: 'Nucleus', isCorrect: false },
    ],
  };
}

describe('Game Quiz AI schemas', () => {
  it('accepts and trims a complete generation request', () => {
    expect(gameQuizAIGenerationInputSchema.parse(validInput())).toEqual({
      ...validInput(),
      additionalPrompt: 'Emphasize practical examples.',
      topic: 'Photosynthesis',
    });
  });

  it.each([
    ['invalid course UUID', { courseId: 'course-1' }],
    ['no lessons', { lessonIds: [] }],
    [
      'more than twenty lessons',
      {
        lessonIds: Array.from(
          { length: 21 },
          (_, index) =>
            `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`
        ),
      },
    ],
    ['duplicate lessons', { lessonIds: [LESSON_ID, LESSON_ID] }],
    ['zero questions', { questionCount: 0 }],
    ['more than twenty questions', { questionCount: 21 }],
    ['fractional question count', { questionCount: 2.5 }],
    [
      'prompt longer than 500 characters',
      { additionalPrompt: 'x'.repeat(501) },
    ],
  ])('rejects %s', (_name, override) => {
    expect(
      gameQuizAIGenerationInputSchema.safeParse({
        ...validInput(),
        ...override,
      }).success
    ).toBe(false);
  });

  it('accepts a complete generated question', () => {
    expect(gameQuizAIGeneratedQuestionSchema.parse(validQuestion())).toEqual(
      validQuestion()
    );
  });

  it.each([
    ['an empty prompt', { prompt: '   ' }],
    ['an empty hint', { hint: '' }],
    ['an empty explanation', { explanation: '' }],
    ['a timer below five seconds', { timerSeconds: 4 }],
    ['a timer above five minutes', { timerSeconds: 301 }],
    ['zero points', { maxPoints: 0 }],
    ['more than 10,000 points', { maxPoints: 10_001 }],
    [
      'fewer than two options',
      { options: [{ text: 'Only', isCorrect: true }] },
    ],
    [
      'more than four options',
      {
        options: Array.from({ length: 5 }, (_, index) => ({
          text: `Option ${index + 1}`,
          isCorrect: index === 0,
        })),
      },
    ],
    [
      'no correct option',
      {
        options: [
          { text: 'One', isCorrect: false },
          { text: 'Two', isCorrect: false },
        ],
      },
    ],
    [
      'multiple correct options',
      {
        options: [
          { text: 'One', isCorrect: true },
          { text: 'Two', isCorrect: true },
        ],
      },
    ],
  ])('rejects a generated question with %s', (_name, override) => {
    expect(
      gameQuizAIGeneratedQuestionSchema.safeParse({
        ...validQuestion(),
        ...override,
      }).success
    ).toBe(false);
  });
});
