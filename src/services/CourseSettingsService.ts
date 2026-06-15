import {
  CourseRoleName,
  type CourseRoleName as CourseRoleNameType,
} from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

type CourseSettingsMemberView = {
  id: string;
  email: string;
  image: string | null;
  name: string;
  role: CourseRoleNameType;
};

type CourseSettingsMutationResponse = {
  id: string;
  message: string;
};

type CourseSettingsUpdateInput = {
  courseId: string;
  currentUserId: string;
  description: string | null;
  isPublished: boolean;
  title: string;
};

type ConfirmedCourseMutationInput = {
  confirmationCourseId: string;
  courseId: string;
  currentUserId: string;
};

type CourseSettingsTransaction = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

function assertConfirmationMatches(
  courseId: string,
  confirmationCourseId: string
) {
  if (courseId !== confirmationCourseId) {
    throw new Error('Course ID confirmation does not match');
  }
}

export class CourseSettingsService {
  private static async getActiveCourse(courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        archivedAt: true,
        createdAt: true,
        deletedAt: true,
        description: true,
        id: true,
        isPublished: true,
        ownerId: true,
        title: true,
        updatedAt: true,
      },
    });

    if (!course || course.deletedAt) {
      throw new Error('Course not found');
    }

    return course;
  }

  private static async getCurrentEnrollment(courseId: string, userId: string) {
    return prisma.enrollment.findFirst({
      where: { courseId, memberId: userId },
      select: {
        id: true,
        memberId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  private static async assertCourseMember(courseId: string, userId: string) {
    const course = await CourseSettingsService.getActiveCourse(courseId);
    const enrollment = await CourseSettingsService.getCurrentEnrollment(
      courseId,
      userId
    );

    if (!enrollment && course.ownerId !== userId) {
      throw new Error('Forbidden');
    }

    return { course, enrollment };
  }

  private static async assertCourseOwnerRole(courseId: string, userId: string) {
    const { course, enrollment } =
      await CourseSettingsService.assertCourseMember(courseId, userId);

    if (enrollment?.role.name !== CourseRoleName.COURSE_OWNER) {
      throw new Error('Forbidden');
    }

    return { course, enrollment };
  }

  static async getSettings(courseId: string, currentUserId: string) {
    const { course, enrollment } =
      await CourseSettingsService.assertCourseMember(courseId, currentUserId);
    const currentRole = enrollment?.role.name ?? CourseRoleName.STUDENT;
    const isOwner = enrollment?.role.name === CourseRoleName.COURSE_OWNER;

    const transferMembers = isOwner
      ? await prisma.enrollment.findMany({
          where: {
            courseId,
            memberId: { not: currentUserId },
          },
          include: {
            member: {
              select: {
                email: true,
                id: true,
                image: true,
                name: true,
              },
            },
            role: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        })
      : [];

    return {
      course: {
        archivedAt: course.archivedAt?.toISOString() ?? null,
        createdAt: course.createdAt.toISOString(),
        description: course.description,
        id: course.id,
        isPublished: course.isPublished,
        ownerId: course.ownerId,
        title: course.title,
        updatedAt: course.updatedAt.toISOString(),
      },
      currentUser: {
        isOwner,
        role: currentRole,
      },
      transferMembers: transferMembers.map(
        (member): CourseSettingsMemberView => ({
          email: member.member.email,
          id: member.member.id,
          image: member.member.image,
          name: member.member.name,
          role: member.role.name,
        })
      ),
    };
  }

  static async updateSettings(input: CourseSettingsUpdateInput) {
    await CourseSettingsService.assertCourseOwnerRole(
      input.courseId,
      input.currentUserId
    );

    return prisma.course.update({
      where: { id: input.courseId },
      data: {
        description: input.description,
        isPublished: input.isPublished,
        title: input.title,
      },
    });
  }

  static async leaveCourse(input: {
    courseId: string;
    currentUserId: string;
  }): Promise<CourseSettingsMutationResponse> {
    const { enrollment } = await CourseSettingsService.assertCourseMember(
      input.courseId,
      input.currentUserId
    );

    if (!enrollment) {
      throw new Error('Course member not found');
    }

    if (enrollment.role.name === CourseRoleName.COURSE_OWNER) {
      throw new Error('Course owner cannot leave the course');
    }

    await prisma.enrollment.delete({
      where: { id: enrollment.id },
      select: { id: true },
    });

    return { id: enrollment.id, message: 'Course left' };
  }

  static async transferOwnership(input: {
    courseId: string;
    currentUserId: string;
    newOwnerUserId: string;
  }): Promise<CourseSettingsMutationResponse> {
    await CourseSettingsService.assertCourseOwnerRole(
      input.courseId,
      input.currentUserId
    );

    if (input.currentUserId === input.newOwnerUserId) {
      throw new Error('New owner must be another course member');
    }

    return prisma.$transaction(async (tx: CourseSettingsTransaction) => {
      const enrollments = await tx.enrollment.findMany({
        where: {
          courseId: input.courseId,
          memberId: { in: [input.currentUserId, input.newOwnerUserId] },
        },
        select: {
          id: true,
          memberId: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      const currentOwnerEnrollment = enrollments.find(
        (enrollment) => enrollment.memberId === input.currentUserId
      );
      const newOwnerEnrollment = enrollments.find(
        (enrollment) => enrollment.memberId === input.newOwnerUserId
      );

      if (
        !currentOwnerEnrollment ||
        currentOwnerEnrollment.role.name !== CourseRoleName.COURSE_OWNER
      ) {
        throw new Error('Forbidden');
      }

      if (!newOwnerEnrollment) {
        throw new Error('Course member not found');
      }

      if (newOwnerEnrollment.role.name === CourseRoleName.COURSE_OWNER) {
        throw new Error('New owner must be another course member');
      }

      await tx.course.update({
        where: { id: input.courseId },
        data: { ownerId: input.newOwnerUserId },
        select: { id: true },
      });
      await tx.enrollment.update({
        where: { id: newOwnerEnrollment.id },
        data: { roleId: currentOwnerEnrollment.role.id },
        select: { id: true },
      });
      await tx.enrollment.update({
        where: { id: currentOwnerEnrollment.id },
        data: { roleId: newOwnerEnrollment.role.id },
        select: { id: true },
      });

      return {
        id: input.courseId,
        message: 'Ownership transferred',
      };
    });
  }

  static async archiveCourse(
    input: ConfirmedCourseMutationInput
  ): Promise<CourseSettingsMutationResponse> {
    assertConfirmationMatches(input.courseId, input.confirmationCourseId);
    await CourseSettingsService.assertCourseOwnerRole(
      input.courseId,
      input.currentUserId
    );

    const course = await prisma.course.update({
      where: { id: input.courseId },
      data: { archivedAt: new Date() },
      select: { id: true },
    });

    return { id: course.id, message: 'Course archived' };
  }

  static async unarchiveCourse(input: {
    courseId: string;
    currentUserId: string;
  }): Promise<CourseSettingsMutationResponse> {
    await CourseSettingsService.assertCourseOwnerRole(
      input.courseId,
      input.currentUserId
    );

    const course = await prisma.course.update({
      where: { id: input.courseId },
      data: { archivedAt: null },
      select: { id: true },
    });

    return { id: course.id, message: 'Course unarchived' };
  }

  static async deleteCourse(
    input: ConfirmedCourseMutationInput
  ): Promise<CourseSettingsMutationResponse> {
    assertConfirmationMatches(input.courseId, input.confirmationCourseId);
    await CourseSettingsService.assertCourseOwnerRole(
      input.courseId,
      input.currentUserId
    );

    const course = await prisma.course.update({
      where: { id: input.courseId },
      data: { deletedAt: new Date() },
      select: { id: true },
    });

    return { id: course.id, message: 'Course deleted' };
  }
}
