import type { PrismaClient } from '../src/generated/prisma';
import { DEMO_CHATS, DEMO_COURSES } from './seed-data/demo-data';

interface SeedDemoContentInput {
  prisma: PrismaClient;
  teacherUserId: string;
  studentUserId: string;
  courseOwnerRoleId: string;
  courseStudentRoleId: string;
}

export async function seedDemoContent({
  prisma,
  teacherUserId,
  studentUserId,
  courseOwnerRoleId,
  courseStudentRoleId,
}: SeedDemoContentInput) {
  for (const courseData of DEMO_COURSES) {
    await prisma.course.upsert({
      where: { id: courseData.id },
      update: {
        ownerId: teacherUserId,
        title: courseData.title,
        description: courseData.description,
        isPublished: courseData.isPublished,
        archivedAt: null,
        deletedAt: null,
      },
      create: {
        id: courseData.id,
        ownerId: teacherUserId,
        title: courseData.title,
        description: courseData.description,
        isPublished: courseData.isPublished,
      },
    });

    for (const moduleData of courseData.modules) {
      await prisma.module.upsert({
        where: { id: moduleData.id },
        update: {
          courseId: courseData.id,
          title: moduleData.title,
          orderIndex: moduleData.orderIndex,
        },
        create: {
          id: moduleData.id,
          courseId: courseData.id,
          title: moduleData.title,
          orderIndex: moduleData.orderIndex,
        },
      });

      for (const lessonData of moduleData.lessons) {
        await prisma.lesson.upsert({
          where: { id: lessonData.id },
          update: {
            moduleId: moduleData.id,
            title: lessonData.title,
            orderIndex: lessonData.orderIndex,
            content: lessonData.content,
          },
          create: {
            id: lessonData.id,
            moduleId: moduleData.id,
            title: lessonData.title,
            orderIndex: lessonData.orderIndex,
            content: lessonData.content,
          },
        });
      }
    }

    const demoEnrollments = [
      { memberId: teacherUserId, roleId: courseOwnerRoleId },
      { memberId: studentUserId, roleId: courseStudentRoleId },
    ];

    for (const enrollment of demoEnrollments) {
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: { courseId: courseData.id, memberId: enrollment.memberId },
        select: { id: true },
      });

      if (existingEnrollment) {
        await prisma.enrollment.update({
          where: { id: existingEnrollment.id },
          data: { roleId: enrollment.roleId },
        });
      } else {
        await prisma.enrollment.create({
          data: {
            courseId: courseData.id,
            memberId: enrollment.memberId,
            roleId: enrollment.roleId,
          },
        });
      }
    }
  }

  const demoUsers = { teacher: teacherUserId, student: studentUserId };
  for (const chatData of DEMO_CHATS) {
    const chatUserId = demoUsers[chatData.userKey];

    await prisma.aiChat.upsert({
      where: { id: chatData.id },
      update: {
        userId: chatUserId,
        title: chatData.title,
        type: chatData.type,
        status: 'ACTIVE',
        provider: chatData.provider,
        model: chatData.model,
        deletedAt: null,
      },
      create: {
        id: chatData.id,
        userId: chatUserId,
        title: chatData.title,
        type: chatData.type,
        provider: chatData.provider,
        model: chatData.model,
      },
    });

    for (const [messageIndex, message] of chatData.messages.entries()) {
      await prisma.aiChatMessage.upsert({
        where: { id: message.id },
        update: {
          chatId: chatData.id,
          userId: message.role === 'USER' ? chatUserId : null,
          role: message.role,
          parts: message.parts,
          provider: chatData.provider,
          model: chatData.model,
        },
        create: {
          id: message.id,
          chatId: chatData.id,
          userId: message.role === 'USER' ? chatUserId : null,
          role: message.role,
          parts: message.parts,
          provider: chatData.provider,
          model: chatData.model,
          createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, messageIndex)),
        },
      });
    }
  }

  return { courseCount: DEMO_COURSES.length, chatCount: DEMO_CHATS.length };
}
