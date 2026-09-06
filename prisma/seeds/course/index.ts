import { seedModule } from '../module';
import { demoCourses } from './data';
import type { SeedCourseEnrollmentInput, SeedDemoCoursesInput } from './types';

async function seedCourseEnrollment({
  prisma,
  courseId,
  memberId,
  roleId,
}: SeedCourseEnrollmentInput) {
  const existingEnrollment = await prisma.enrollment.findFirst({
    where: { courseId, memberId },
    select: { id: true },
  });

  if (existingEnrollment) {
    await prisma.enrollment.update({
      where: { id: existingEnrollment.id },
      data: { roleId },
    });
    return;
  }

  await prisma.enrollment.create({
    data: {
      courseId,
      memberId,
      roleId,
    },
  });
}

export async function seedDemoCourses({
  prisma,
  teacherUserId,
  studentUserId,
  courseOwnerRoleId,
  courseStudentRoleId,
}: SeedDemoCoursesInput) {
  for (const courseData of demoCourses) {
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
      await seedModule({
        prisma,
        courseId: courseData.id,
        moduleData,
      });
    }

    for (const assignmentData of courseData.assignments) {
      await prisma.assignment.upsert({
        where: { id: assignmentData.id },
        update: {
          courseId: courseData.id,
          createdById: teacherUserId,
          title: assignmentData.title,
          content: assignmentData.content,
          dueAt: assignmentData.dueAt,
          maxPoints: assignmentData.maxPoints,
        },
        create: {
          id: assignmentData.id,
          courseId: courseData.id,
          createdById: teacherUserId,
          title: assignmentData.title,
          content: assignmentData.content,
          dueAt: assignmentData.dueAt,
          maxPoints: assignmentData.maxPoints,
        },
      });
    }

    await seedCourseEnrollment({
      prisma,
      courseId: courseData.id,
      memberId: teacherUserId,
      roleId: courseOwnerRoleId,
    });
    await seedCourseEnrollment({
      prisma,
      courseId: courseData.id,
      memberId: studentUserId,
      roleId: courseStudentRoleId,
    });
  }

  return demoCourses.length;
}
