import { CoursePermissionKey, CourseRoleName } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

export class CourseService {
  static async createCourse(data: {
    teacherId: string;
    title: string;
    description?: string;
  }) {
    // We create the course and also assign the creator as the OWNER in CourseRole
    return await prisma.$transaction(async (tx) => {
      // Create the course
      const course = await tx.course.create({
        data: {
          teacherId: data.teacherId,
          title: data.title,
          description: data.description,
        },
      });

      // Get or create the OWNER role
      let ownerRole = await tx.courseRole.findUnique({
        where: { name: CourseRoleName.OWNER },
      });

      if (!ownerRole) {
        ownerRole = await tx.courseRole.create({
          data: { name: CourseRoleName.OWNER },
        });
      }

      // Add enrollment for the creator as OWNER
      await tx.enrollment.create({
        data: {
          studentId: data.teacherId,
          courseId: course.id,
          roleId: ownerRole.id,
        },
      });

      return course;
    });
  }

  static async getCoursesByTeacher(teacherId: string) {
    return await prisma.course.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { modules: true, enrollments: true },
        },
      },
    });
  }

  static async getCourseById(courseId: string, userId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    const member = await prisma.enrollment.findFirst({
      where: {
        courseId,
        studentId: userId,
      },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    if (!member && course.teacherId !== userId) {
      throw new Error('Unauthorized');
    }

    return course;
  }
  static async togglePublish(
    courseId: string,
    isPublished: boolean,
    teacherId: string
  ) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    if (course.teacherId !== teacherId) {
      throw new Error('Unauthorized');
    }

    return await prisma.course.update({
      where: { id: courseId },
      data: { isPublished },
    });
  }
}
