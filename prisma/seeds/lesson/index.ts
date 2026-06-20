import type { SeedLessonInput } from './types';

export async function seedLesson({
  prisma,
  moduleId,
  lessonData,
}: SeedLessonInput) {
  await prisma.lesson.upsert({
    where: { id: lessonData.id },
    update: {
      moduleId,
      title: lessonData.title,
      orderIndex: lessonData.orderIndex,
      content: lessonData.content,
    },
    create: {
      id: lessonData.id,
      moduleId,
      title: lessonData.title,
      orderIndex: lessonData.orderIndex,
      content: lessonData.content,
    },
  });
}
