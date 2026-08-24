import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuizService } from '@/services/QuizService';

const mocks = vi.hoisted(() => {
  const tx = {
    question: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
    quiz: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    lessonQuiz: {
      createMany: vi.fn(),
    },
    quizQuestion: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  };

  return {
    getCoursePermissions: vi.fn(),
    withoutPermission: vi.fn<(permission: string) => boolean>(() => false),
    lesson: {
      findMany: vi.fn(),
    },
    question: {
      findMany: vi.fn(),
    },
    quiz: {
      findUnique: vi.fn(),
    },
    tx,
    $transaction: vi.fn((callback) => callback(tx)),
  };
});

vi.mock('@/lib/permissions/course-permission', () => ({
  getCoursePermissions: mocks.getCoursePermissions,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lesson: mocks.lesson,
    question: mocks.question,
    quiz: mocks.quiz,
    $transaction: mocks.$transaction,
  },
}));

function makeTrueFalseQuestion(index: number) {
  return {
    type: 'true_false' as const,
    prompt: `Question ${index + 1}?`,
    correctAnswer: index % 2 === 0,
    explanation: `Explanation ${index + 1}`,
  };
}

describe('QuizService.createForCourse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCoursePermissions.mockResolvedValue({
      withoutPermission: mocks.withoutPermission,
    });
    mocks.lesson.findMany.mockResolvedValue([
      { id: 'lesson-1' },
      { id: 'lesson-2' },
    ]);
    mocks.tx.question.createMany.mockResolvedValue({ count: 15 });
    mocks.tx.question.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.quiz.create.mockResolvedValue({ id: 'quiz-1' });
    mocks.quiz.findUnique.mockResolvedValue({
      id: 'quiz-1',
      courseId: 'course-1',
    });
  });

  it('bulk inserts manually created quiz questions and preserves quiz order', async () => {
    const questions = Array.from({ length: 15 }, (_, index) =>
      makeTrueFalseQuestion(index)
    );
    mocks.tx.quiz.findUnique.mockImplementation(() => {
      const insertedQuestions = mocks.tx.question.createMany.mock.calls[0]?.[0]
        ?.data as Array<{ id: string }>;
      return Promise.resolve({
        id: 'quiz-1',
        title: 'Chapter 1',
        description: null,
        deliveryMode: 'INSTANT_FEEDBACK',
        selectionMethod: 'MANUAL_CREATE',
        questionCount: 15,
        questionCounts: { TRUE_FALSE: 15 },
        questions: [],
        lessonQuizzes: [
          { lesson: { id: 'lesson-1' } },
          { lesson: { id: 'lesson-2' } },
        ],
        quizQuestions: insertedQuestions.map((insertedQuestion, orderIndex) => {
          const question = questions[orderIndex];
          return {
            questionId: insertedQuestion.id,
            orderIndex,
            question: {
              answerData: question,
              explanation: question.explanation,
            },
          };
        }),
      });
    });

    const quiz = await QuizService.createForCourse('course-1', 'teacher-1', {
      lessonIds: ['lesson-1', 'lesson-2'],
      title: 'Chapter 1',
      questionCounts: { TRUE_FALSE: 15 },
      deliveryMode: 'INSTANT_FEEDBACK',
      selectionMethod: 'MANUAL_CREATE',
      questionCount: 15,
      questions,
      questionIds: Array.from({ length: 15 }, () => null),
    });

    expect(mocks.tx.question.create).not.toHaveBeenCalled();
    expect(mocks.tx.question.createMany).toHaveBeenCalledTimes(1);
    const insertedQuestions = mocks.tx.question.createMany.mock.calls[0][0]
      .data as Array<{ id: string }>;
    expect(mocks.tx.question.createMany).toHaveBeenCalledWith({
      data: questions.map((question, index) => ({
        id: insertedQuestions[index].id,
        courseId: 'course-1',
        category: 'SELECTION_BASED',
        subType: 'TRUE_FALSE',
        prompt: question.prompt,
        answerData: question,
        explanation: question.explanation,
      })),
    });
    expect(mocks.tx.lessonQuiz.createMany).toHaveBeenCalledWith({
      data: [
        { quizId: 'quiz-1', lessonId: 'lesson-1' },
        { quizId: 'quiz-1', lessonId: 'lesson-2' },
      ],
    });
    expect(mocks.tx.quizQuestion.createMany).toHaveBeenCalledWith({
      data: questions.map((_, orderIndex) => ({
        quizId: 'quiz-1',
        questionId: insertedQuestions[orderIndex].id,
        orderIndex,
      })),
    });
    expect(quiz.questionIds).toEqual(insertedQuestions.map(({ id }) => id));
  });

  it('bulk inserts new questions when replacing quiz questions', async () => {
    const questions = Array.from({ length: 15 }, (_, index) =>
      makeTrueFalseQuestion(index)
    );
    mocks.tx.quiz.update.mockImplementation(() => {
      const insertedQuestions = mocks.tx.question.createMany.mock.calls[0]?.[0]
        ?.data as Array<{ id: string }>;
      return Promise.resolve({
        id: 'quiz-1',
        title: 'Chapter 1',
        description: null,
        deliveryMode: 'INSTANT_FEEDBACK',
        selectionMethod: 'MANUAL_CREATE',
        questionCount: 15,
        questionCounts: { TRUE_FALSE: 15 },
        questions: [],
        lessonQuizzes: [],
        quizQuestions: insertedQuestions.map((insertedQuestion, orderIndex) => {
          const question = questions[orderIndex];
          return {
            questionId: insertedQuestion.id,
            orderIndex,
            question: {
              answerData: question,
              explanation: question.explanation,
            },
          };
        }),
      });
    });

    const quiz = await QuizService.updateQuestions(
      'quiz-1',
      'teacher-1',
      questions,
      Array.from({ length: 15 }, () => null)
    );

    expect(mocks.tx.question.create).not.toHaveBeenCalled();
    expect(mocks.tx.question.createMany).toHaveBeenCalledTimes(1);
    expect(mocks.tx.question.updateMany).not.toHaveBeenCalled();
    const insertedQuestions = mocks.tx.question.createMany.mock.calls[0][0]
      .data as Array<{ id: string }>;
    expect(mocks.tx.question.createMany).toHaveBeenCalledWith({
      data: questions.map((question, index) => ({
        id: insertedQuestions[index].id,
        courseId: 'course-1',
        category: 'SELECTION_BASED',
        subType: 'TRUE_FALSE',
        prompt: question.prompt,
        answerData: question,
        explanation: question.explanation,
      })),
    });
    expect(mocks.tx.quizQuestion.deleteMany).toHaveBeenCalledWith({
      where: { quizId: 'quiz-1' },
    });
    expect(mocks.tx.quizQuestion.createMany).toHaveBeenCalledWith({
      data: questions.map((_, orderIndex) => ({
        quizId: 'quiz-1',
        questionId: insertedQuestions[orderIndex].id,
        orderIndex,
      })),
    });
    expect(quiz.questionIds).toEqual(insertedQuestions.map(({ id }) => id));
  });
});
