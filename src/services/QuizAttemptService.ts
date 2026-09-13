import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import type {
  AttemptCheck,
  AttemptComplete,
  AttemptProgress,
} from '@/lib/validations/quiz-attempt.schema';
import {
  countAnsweredQuestions,
  createQuizAttemptSnapshot,
} from '@/utils/quiz-attempt-snapshot';
import { resolveReferencedQuestions } from '@/utils/quiz-question-references';
import {
  answersSchema,
  assertActiveRevision,
  presentAttempt,
  QuizAttemptError,
  scoreAttempt,
  snapshotSchema,
  validateProgress,
} from './quiz-attempt-data';

const quizInclude = {
  course: { select: { id: true, title: true, ownerId: true, deletedAt: true } },
  quizQuestions: {
    orderBy: { orderIndex: 'asc' as const },
    select: {
      questionId: true,
      orderIndex: true,
      question: { select: { answerData: true, explanation: true } },
    },
  },
} satisfies Prisma.QuizInclude;

async function requireCourseAccess(
  userId: string,
  course: { id: string; ownerId: string; deletedAt: Date | null }
) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { memberId: userId, courseId: course.id, status: 'ACTIVE' },
    select: { id: true },
  });
  if (course.deletedAt || (!enrollment && course.ownerId !== userId))
    throw new QuizAttemptError(
      403,
      'FORBIDDEN',
      'You do not have access to this course.'
    );
}

async function getQuiz(userId: string, quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: quizInclude,
  });
  if (!quiz)
    throw new QuizAttemptError(404, 'QUIZ_NOT_FOUND', 'Quiz not found.');
  await requireCourseAccess(userId, quiz.course);
  return quiz;
}

async function getOwned(userId: string, attemptId: string, allowEnd = false) {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, userId },
    include: { quiz: { include: quizInclude } },
  });
  if (!attempt)
    throw new QuizAttemptError(404, 'ATTEMPT_NOT_FOUND', 'Attempt not found.');
  if (!allowEnd) await requireCourseAccess(userId, attempt.quiz.course);
  return attempt;
}

function presentOwned(attempt: Awaited<ReturnType<typeof getOwned>>) {
  const fallback = attempt.quizSnapshot
    ? undefined
    : createQuizAttemptSnapshot(
        attempt.quiz,
        resolveReferencedQuestions(
          attempt.quiz.quizQuestions,
          attempt.quiz.questions
        ).questions
      );
  return {
    ...presentAttempt(attempt, fallback),
    courseId: attempt.quiz.courseId,
  };
}

async function writeProgress(
  attempt: Awaited<ReturnType<typeof getOwned>>,
  revision: number,
  data: Prisma.QuizAttemptUpdateManyMutationInput
) {
  const updated = await prisma.$transaction(async (tx) => {
    const write = await tx.quizAttempt.updateMany({
      where: {
        id: attempt.id,
        userId: attempt.userId,
        status: 'IN_PROGRESS',
        revision,
      },
      data,
    });
    if (!write.count)
      throw new QuizAttemptError(
        409,
        'ATTEMPT_CONFLICT',
        'This attempt changed elsewhere. Reload the saved attempt.'
      );
    return tx.quizAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
  });
  return presentOwned({ ...attempt, ...updated });
}

export const QuizAttemptService = {
  async active(userId: string) {
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId, status: 'IN_PROGRESS' },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        quizId: true,
        revision: true,
        quiz: {
          select: {
            title: true,
            courseId: true,
            course: { select: { title: true } },
          },
        },
      },
    });
    return attempts.map((a) => ({
      id: a.id,
      quizId: a.quizId,
      revision: a.revision,
      title: a.quiz.title,
      courseId: a.quiz.courseId,
      courseTitle: a.quiz.course.title,
      href: `/courses/${a.quiz.courseId}/quiz/${a.quizId}`,
    }));
  },
  async start(userId: string, quizId: string) {
    const quiz = await getQuiz(userId, quizId);
    const existing = await prisma.quizAttempt.findFirst({
      where: { userId, quizId, status: 'IN_PROGRESS' },
    });
    if (existing) return this.get(userId, existing.id);
    const snapshot = snapshotSchema.parse(
      createQuizAttemptSnapshot(
        quiz,
        resolveReferencedQuestions(quiz.quizQuestions, quiz.questions).questions
      )
    );
    try {
      const attempt = await prisma.quizAttempt.create({
        data: {
          userId,
          quizId,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          quizSnapshot: snapshot,
          answers: {},
        },
      });
      return this.get(userId, attempt.id);
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      )
        throw error;
      const active = await prisma.quizAttempt.findFirst({
        where: { userId, quizId, status: 'IN_PROGRESS' },
      });
      if (!active) throw error;
      return this.get(userId, active.id);
    }
  },
  async get(userId: string, attemptId: string) {
    return presentOwned(await getOwned(userId, attemptId));
  },
  async history(userId: string, quizId: string) {
    await getQuiz(userId, quizId);
    return prisma.quizAttempt.findMany({
      where: { userId, quizId, status: 'COMPLETED' },
      orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        quizId: true,
        completedAt: true,
        completionReason: true,
        answeredCount: true,
        score: true,
        maxScore: true,
        percentage: true,
        hasPendingReview: true,
      },
    });
  },
  async save(userId: string, attemptId: string, input: AttemptProgress) {
    const attempt = await getOwned(userId, attemptId);
    assertActiveRevision(attempt, input.revision);
    const snapshot = validateProgress(
      attempt,
      input.answers,
      input.currentQuestionIndex
    );
    return writeProgress(attempt, input.revision, {
      answers: input.answers,
      currentQuestionIndex: input.currentQuestionIndex,
      revision: { increment: 1 },
      answeredCount: countAnsweredQuestions(
        input.answers,
        snapshot.questions.length
      ),
    });
  },
  async check(userId: string, attemptId: string, input: AttemptCheck) {
    const attempt = await getOwned(userId, attemptId);
    assertActiveRevision(attempt, input.revision);
    const answers = {
      ...answersSchema.parse(attempt.answers),
      [input.questionIndex]: input.answer,
    };
    const snapshot = validateProgress(attempt, answers, input.questionIndex);
    if (snapshot.deliveryMode !== 'INSTANT_FEEDBACK')
      throw new QuizAttemptError(
        403,
        'FEEDBACK_UNAVAILABLE',
        'Answers are available after submission.'
      );
    return writeProgress(attempt, input.revision, {
      answers,
      checkedQuestionIndices: [
        ...new Set([...attempt.checkedQuestionIndices, input.questionIndex]),
      ],
      revision: { increment: 1 },
      answeredCount: countAnsweredQuestions(answers, snapshot.questions.length),
    });
  },
  async complete(userId: string, attemptId: string, input: AttemptComplete) {
    const attempt = await getOwned(
      userId,
      attemptId,
      input.completionReason === 'ENDED_EARLY'
    );
    if (attempt.status === 'COMPLETED') return presentOwned(attempt);
    assertActiveRevision(attempt, input.revision);
    const snapshot = snapshotSchema.parse(attempt.quizSnapshot);
    const answers = answersSchema.parse(attempt.answers);
    if (
      input.completionReason === 'SUBMITTED' &&
      countAnsweredQuestions(answers, snapshot.questions.length) !==
        snapshot.questions.length
    ) {
      throw new QuizAttemptError(
        400,
        'INCOMPLETE_ATTEMPT',
        'Answer every question before submitting, or end the attempt early.'
      );
    }
    if (
      input.completionReason === 'SUBMITTED' &&
      snapshot.deliveryMode === 'INSTANT_FEEDBACK' &&
      attempt.checkedQuestionIndices.length !== snapshot.questions.length
    ) {
      throw new QuizAttemptError(
        400,
        'UNCHECKED_ANSWERS',
        'Check every answer before submitting this quiz.'
      );
    }
    const result = scoreAttempt(snapshot, answers);
    // Compare-and-swap in a transaction makes completion atomic and retry-safe.
    const completed = await prisma.$transaction(async (tx) => {
      const update = await tx.quizAttempt.updateMany({
        where: {
          id: attemptId,
          userId,
          status: 'IN_PROGRESS',
          revision: input.revision,
        },
        data: {
          status: 'COMPLETED',
          completionReason: input.completionReason,
          completedAt: new Date(),
          revision: { increment: 1 },
          score: result.earnedPoints,
          maxScore: result.totalPoints,
          percentage: result.percentage,
          results: result.questionResults as unknown as Prisma.InputJsonValue,
          hasPendingReview: result.hasPendingReview ?? false,
        },
      });
      const current = await tx.quizAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        include: { quiz: { include: quizInclude } },
      });
      if (!update.count && current.status !== 'COMPLETED')
        throw new QuizAttemptError(
          409,
          'ATTEMPT_CONFLICT',
          'This attempt changed elsewhere. Reload the saved attempt.'
        );
      return current;
    });
    return presentOwned(completed);
  },
};
