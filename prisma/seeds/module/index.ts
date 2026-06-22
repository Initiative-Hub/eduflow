import { seedLesson } from '../lesson';
import type { SeedModuleInput } from './types';

export async function seedModule({
  prisma,
  courseId,
  moduleData,
}: SeedModuleInput) {
  await prisma.module.upsert({
    where: { id: moduleData.id },
    update: {
      courseId,
      title: moduleData.title,
      orderIndex: moduleData.orderIndex,
      deletedAt: null,
    },
    create: {
      id: moduleData.id,
      courseId,
      title: moduleData.title,
      orderIndex: moduleData.orderIndex,
    },
  });

  for (const lessonData of moduleData.lessons) {
    await seedLesson({
      prisma,
      moduleId: moduleData.id,
      lessonData,
    });
  }
}
