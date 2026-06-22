/**
 * Seeds the quiz system data (modules, lessons, questions, quizzes) for
 * course d89eb3f1-3224-4c1a-a924-8df7619c84a6.
 *
 * Run with: bun scripts/seed-quiz-data.ts
 */

import { PrismaPg } from '@prisma/adapter-pg';
import seedData from '../prisma/seed-data/quiz-seed-data.json';
import { PrismaClient } from '../src/generated/prisma';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const courseId = seedData.courseId;

  // Verify the course exists
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    console.error(`Course ${courseId} not found. Please create it first.`);
    process.exit(1);
  }

  console.log(`Seeding quiz data for course: ${course.title} (${courseId})`);

  // Clean existing quiz data for this course
  await prisma.quizQuestion.deleteMany({
    where: { quiz: { courseId } },
  });
  await prisma.quiz.deleteMany({ where: { courseId } });
  await prisma.question.deleteMany({ where: { courseId } });

  // Delete existing modules/lessons for this course (to avoid duplicates)
  await prisma.module.deleteMany({ where: { courseId } });

  console.log('Cleaned existing data.');

  // Create modules and lessons
  for (const mod of seedData.modules) {
    await prisma.module.create({
      data: {
        id: mod.id,
        courseId,
        title: mod.title,
        orderIndex: mod.orderIndex,
        lessons: {
          create: mod.lessons.map((les) => ({
            id: les.id,
            title: les.title,
            orderIndex: les.orderIndex,
            content: les.content as any,
          })),
        },
      },
    });
  }
  console.log(
    `Created ${seedData.modules.length} modules with ${seedData.modules.reduce((sum, m) => sum + m.lessons.length, 0)} lessons.`
  );

  // Create questions
  for (const q of seedData.questions) {
    await prisma.question.create({
      data: {
        id: q.id,
        courseId,
        lessonId: q.lessonId,
        category: q.category as any,
        subType: q.subType as any,
        prompt: q.prompt,
        answerData: q.answerData as any,
        explanation: q.explanation,
      },
    });
  }
  console.log(`Created ${seedData.questions.length} questions.`);

  // Create quizzes with their question associations
  for (const quiz of seedData.quizzes) {
    await prisma.quiz.create({
      data: {
        id: quiz.id,
        courseId,
        title: quiz.title,
        description: quiz.description,
        category: quiz.category as any,
        subType: quiz.subType as any,
        deliveryMode: quiz.deliveryMode as any,
        selectionMethod: quiz.selectionMethod as any,
        questionCount: quiz.questionCount,
        lessonQuizzes: {
          create: [{ lessonId: quiz.lessonId }],
        },
        quizQuestions: {
          create: quiz.questionIds.map((qId, index) => ({
            questionId: qId,
            orderIndex: index,
          })),
        },
      },
    });
  }
  console.log(`Created ${seedData.quizzes.length} quizzes.`);

  console.log('Quiz data seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
