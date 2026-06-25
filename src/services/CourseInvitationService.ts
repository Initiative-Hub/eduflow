import type { PrismaClient } from '@/generated/prisma';
import {
  CourseEnrollmentStatus,
  CourseInvitationStatus,
  type CourseRoleName as CourseRoleNameType,
  PlatformRoleName,
} from '@/generated/prisma';
import { APP_URL } from '@/lib/api/endpoints';
import { emailService } from '@/lib/email-service';
import { prisma } from '@/lib/prisma';
import {
  ASSIGNABLE_COURSE_MEMBER_ROLES,
  type AssignableCourseMemberRole,
} from '@/services/CourseMemberService';

const DEFAULT_INVITATION_TTL_DAYS = 14;
const DEFAULT_LINK_TTL_DAYS = 30;
const DEFAULT_LINK_MAX_USES = 100;

const ELIGIBLE_COURSE_MEMBER_PLATFORM_ROLES = [
  PlatformRoleName.TEACHER,
  PlatformRoleName.STUDENT,
] as const;

export type CourseInviteLinkView = {
  id: string;
  courseId: string;
  role: CourseRoleNameType;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  url: string;
};

function isCourseCapacityReachedError(error: unknown) {
  return error instanceof Error && error.message === 'Course capacity reached';
}

async function getCourseCapacityUsage(
  courseId: string,
  client: Omit<
    PrismaClient,
    '$connect' | '$disconnect' | '$on' | '$use' | '$extends'
  > = prisma
) {
  const course = await client.course.findUnique({
    where: { id: courseId },
    select: { capacity: true },
  });

  if (!course) {
    throw new Error('Course not found');
  }

  const activeMemberCount = await client.enrollment.count({
    where: {
      courseId,
      status: CourseEnrollmentStatus.ACTIVE,
    },
  });

  return {
    activeMemberCount,
    capacity: course.capacity,
    isFull: course.capacity !== null && activeMemberCount >= course.capacity,
    remaining:
      course.capacity === null
        ? null
        : Math.max(course.capacity - activeMemberCount, 0),
  };
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function getInviteUrl(invitationId: string) {
  return `${APP_URL}/courses/invitations/${invitationId}/accept`;
}

function getInviteLinkUrl(inviteId: string) {
  return `${APP_URL}/courses/invite/${inviteId}`;
}

function toInviteLinkView(link: {
  id: string;
  courseId: string;
  maxUses: number | null;
  usedCount: number;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  role: { name: CourseRoleNameType };
}): CourseInviteLinkView {
  return {
    id: link.id,
    courseId: link.courseId,
    role: link.role.name,
    maxUses: link.maxUses,
    usedCount: link.usedCount,
    expiresAt: link.expiresAt?.toISOString() ?? null,
    revokedAt: link.revokedAt?.toISOString() ?? null,
    createdAt: link.createdAt.toISOString(),
    url: getInviteLinkUrl(link.id),
  };
}

export class CourseInvitationService {
  static async inviteRegisteredUser(input: {
    courseId: string;
    invitedById: string;
    userId: string;
    role: CourseRoleNameType;
  }) {
    if (
      !ASSIGNABLE_COURSE_MEMBER_ROLES.includes(
        input.role as AssignableCourseMemberRole
      )
    ) {
      throw new Error('Invalid course member role');
    }

    const [course, role, targetUser] = await Promise.all([
      prisma.course.findUnique({
        where: { id: input.courseId },
        select: { id: true, title: true, deletedAt: true },
      }),
      prisma.courseRole.findUnique({
        where: { name: input.role },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          email: true,
          emailVerified: true,
          name: true,
          role: { select: { name: true } },
        },
      }),
    ]);

    if (!course || course.deletedAt) {
      throw new Error('Course not found');
    }

    if (!role) {
      throw new Error('Course role not found');
    }

    if (
      !targetUser?.emailVerified ||
      !ELIGIBLE_COURSE_MEMBER_PLATFORM_ROLES.includes(
        targetUser.role?.name as any
      )
    ) {
      throw new Error('User cannot be invited to courses');
    }

    const invitation = await prisma.$transaction(async (tx) => {
      const existingEnrollment = await tx.enrollment.findFirst({
        where: { courseId: input.courseId, memberId: input.userId },
        select: { id: true, status: true },
      });

      if (existingEnrollment?.status === CourseEnrollmentStatus.ACTIVE) {
        throw new Error('User is already a course member');
      }

      if (existingEnrollment) {
        await tx.enrollment.update({
          where: { id: existingEnrollment.id },
          data: {
            enrolledAt: null,
            invitedAt: new Date(),
            roleId: role.id,
            status: CourseEnrollmentStatus.PENDING_INVITE,
          },
        });
      } else {
        await tx.enrollment.create({
          data: {
            courseId: input.courseId,
            enrolledAt: null,
            invitedAt: new Date(),
            memberId: input.userId,
            roleId: role.id,
            status: CourseEnrollmentStatus.PENDING_INVITE,
          },
        });
      }

      return tx.courseInvitation.upsert({
        where: {
          courseId_inviteeId: {
            courseId: input.courseId,
            inviteeId: input.userId,
          },
        },
        create: {
          courseId: input.courseId,
          expiresAt: addDays(DEFAULT_INVITATION_TTL_DAYS),
          invitedById: input.invitedById,
          inviteeId: input.userId,
          roleId: role.id,
          status: CourseInvitationStatus.PENDING,
        },
        update: {
          acceptedAt: null,
          cancelledAt: null,
          declinedAt: null,
          expiresAt: addDays(DEFAULT_INVITATION_TTL_DAYS),
          invitedById: input.invitedById,
          roleId: role.id,
          status: CourseInvitationStatus.PENDING,
        },
        select: { id: true },
      });
    });

    await emailService.sendCourseInvitation({
      acceptUrl: getInviteUrl(invitation.id),
      courseName: course.title,
      user: {
        email: targetUser.email,
        name: targetUser.name,
      },
    });

    await prisma.courseInvitation.update({
      where: { id: invitation.id },
      data: { sentAt: new Date() },
    });

    return { id: invitation.id, message: 'Invitation sent' };
  }

  static async acceptDirectInvitation(input: {
    invitationId: string;
    userId: string;
  }): Promise<
    | { ok: true; courseId: string }
    | { ok: false; reason: 'wrong_user' }
    | {
        ok: false;
        reason: 'not_pending';
        status: CourseInvitationStatus;
        courseId: string;
      }
    | { ok: false; reason: 'expired'; expiresAt: Date; courseId: string }
    | { ok: false; reason: 'capacity_full'; courseId: string }
  > {
    const invitation = await prisma.courseInvitation.findUnique({
      where: { id: input.invitationId },
      include: { course: { select: { deletedAt: true, id: true } } },
    });

    if (!invitation || invitation.course.deletedAt) {
      throw new Error('Invitation not found');
    }

    if (invitation.inviteeId !== input.userId) {
      return { ok: false, reason: 'wrong_user' };
    }

    if (invitation.status !== CourseInvitationStatus.PENDING) {
      return {
        ok: false,
        reason: 'not_pending',
        status: invitation.status,
        courseId: invitation.courseId,
      };
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      await prisma.courseInvitation.update({
        where: { id: invitation.id },
        data: { status: CourseInvitationStatus.EXPIRED },
      });
      return {
        ok: false,
        reason: 'expired',
        expiresAt: invitation.expiresAt,
        courseId: invitation.courseId,
      };
    }

    try {
      await prisma.$transaction(async (tx) => {
        const usage = await getCourseCapacityUsage(invitation.courseId, tx);

        if (usage.isFull) {
          throw new Error('Course capacity reached');
        }

        await tx.courseInvitation.update({
          where: { id: invitation.id },
          data: {
            acceptedAt: new Date(),
            status: CourseInvitationStatus.ACCEPTED,
          },
        });
        await tx.enrollment.upsert({
          where: {
            courseId_memberId: {
              courseId: invitation.courseId,
              memberId: invitation.inviteeId,
            },
          },
          create: {
            courseId: invitation.courseId,
            enrolledAt: new Date(),
            memberId: invitation.inviteeId,
            roleId: invitation.roleId,
            status: CourseEnrollmentStatus.ACTIVE,
          },
          update: {
            enrolledAt: new Date(),
            invitedAt: null,
            roleId: invitation.roleId,
            status: CourseEnrollmentStatus.ACTIVE,
          },
        });
      });
    } catch (error) {
      if (isCourseCapacityReachedError(error)) {
        return {
          ok: false,
          reason: 'capacity_full',
          courseId: invitation.courseId,
        };
      }

      throw error;
    }

    return { ok: true, courseId: invitation.courseId };
  }

  static async declineDirectInvitation(input: {
    invitationId: string;
    userId: string;
  }) {
    const invitation = await prisma.courseInvitation.findUnique({
      where: { id: input.invitationId },
      select: {
        courseId: true,
        id: true,
        inviteeId: true,
        status: true,
      },
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.inviteeId !== input.userId) {
      throw new Error('Invitation belongs to another user');
    }

    if (invitation.status !== CourseInvitationStatus.PENDING) {
      throw new Error('Invitation is not pending');
    }

    await prisma.$transaction([
      prisma.courseInvitation.update({
        where: { id: invitation.id },
        data: {
          declinedAt: new Date(),
          status: CourseInvitationStatus.DECLINED,
        },
      }),
      prisma.enrollment.deleteMany({
        where: {
          courseId: invitation.courseId,
          memberId: invitation.inviteeId,
          status: CourseEnrollmentStatus.PENDING_INVITE,
        },
      }),
    ]);

    return { id: invitation.id, message: 'Invitation declined' };
  }

  static async listInviteLinks(courseId: string) {
    const links = await prisma.courseInviteLink.findMany({
      where: { courseId },
      include: { role: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return { data: links.map(toInviteLinkView) };
  }

  static async createInviteLink(input: {
    courseId: string;
    createdById: string;
    role: CourseRoleNameType;
    maxUses?: number | null;
    expiresAt?: Date | null;
  }) {
    if (
      !ASSIGNABLE_COURSE_MEMBER_ROLES.includes(
        input.role as AssignableCourseMemberRole
      )
    ) {
      throw new Error('Invalid course member role');
    }

    const [course, role] = await Promise.all([
      prisma.course.findUnique({
        where: { id: input.courseId },
        select: { deletedAt: true, id: true },
      }),
      prisma.courseRole.findUnique({
        where: { name: input.role },
        select: { id: true },
      }),
    ]);

    if (!course || course.deletedAt) {
      throw new Error('Course not found');
    }

    if (!role) {
      throw new Error('Course role not found');
    }

    const link = await prisma.courseInviteLink.create({
      data: {
        courseId: input.courseId,
        createdById: input.createdById,
        expiresAt: input.expiresAt ?? addDays(DEFAULT_LINK_TTL_DAYS),
        maxUses: input.maxUses ?? DEFAULT_LINK_MAX_USES,
        roleId: role.id,
      },
      include: { role: { select: { name: true } } },
    });

    return toInviteLinkView(link);
  }

  static async revokeInviteLink(input: { courseId: string; inviteId: string }) {
    const link = await prisma.courseInviteLink.findFirst({
      where: { courseId: input.courseId, id: input.inviteId },
      select: { id: true },
    });

    if (!link) {
      throw new Error('Invite link not found');
    }

    await prisma.courseInviteLink.update({
      where: { id: link.id },
      data: { revokedAt: new Date() },
    });

    return { id: link.id, message: 'Invite link revoked' };
  }

  static async getPublicInviteView(inviteId: string, userId?: string | null) {
    const link = await prisma.courseInviteLink.findUnique({
      where: { id: inviteId },
      include: {
        course: {
          select: {
            capacity: true,
            deletedAt: true,
            id: true,
            title: true,
          },
        },
      },
    });

    if (!link || link.course.deletedAt) {
      throw new Error('Invite link not found');
    }

    const [capacityState, existingEnrollment] = await Promise.all([
      getCourseCapacityUsage(link.course.id),
      userId
        ? prisma.enrollment.findUnique({
            where: {
              courseId_memberId: {
                courseId: link.course.id,
                memberId: userId,
              },
            },
            select: { status: true },
          })
        : null,
    ]);

    return {
      course: {
        id: link.course.id,
        title: link.course.title,
      },
      capacity: capacityState.capacity,
      activeMemberCount: capacityState.activeMemberCount,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      isAlreadyJoined:
        existingEnrollment?.status === CourseEnrollmentStatus.ACTIVE,
      isCapacityFull: capacityState.isFull,
      isExpired: Boolean(link.expiresAt && link.expiresAt < new Date()),
      isRevoked: Boolean(link.revokedAt),
      isUsageLimitReached:
        link.maxUses !== null && link.usedCount >= link.maxUses,
    };
  }

  static async joinByPublicInviteLink(input: {
    inviteId: string;
    userId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const link = await tx.courseInviteLink.findUnique({
        where: { id: input.inviteId },
        include: {
          course: { select: { deletedAt: true, id: true } },
          role: { select: { id: true } },
        },
      });

      if (!link || link.course.deletedAt) {
        throw new Error('Invite link not found');
      }

      if (link.revokedAt) {
        throw new Error('Invite link has been revoked');
      }

      if (link.expiresAt && link.expiresAt < new Date()) {
        throw new Error('Invite link has expired');
      }

      if (link.maxUses !== null && link.usedCount >= link.maxUses) {
        throw new Error('Invite link usage limit reached');
      }

      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          courseId_memberId: {
            courseId: link.courseId,
            memberId: input.userId,
          },
        },
        select: { status: true },
      });

      const alreadyActive =
        existingEnrollment?.status === CourseEnrollmentStatus.ACTIVE;

      if (alreadyActive) {
        return { courseId: link.courseId, message: 'Already joined course' };
      }

      const usage = await getCourseCapacityUsage(link.courseId, tx);

      if (usage.isFull) {
        throw new Error('Course capacity reached');
      }

      await tx.enrollment.update({
        where: {
          courseId_memberId: {
            courseId: link.courseId,
            memberId: input.userId,
          },
        },
        data: {
          enrolledAt: new Date(),
          invitedAt: null,
          roleId: link.roleId,
          status: CourseEnrollmentStatus.ACTIVE,
        },
      });

      await tx.courseInviteLink.update({
        where: { id: link.id },
        data: { lastUsedAt: new Date(), usedCount: { increment: 1 } },
      });

      await tx.courseInvitation.updateMany({
        where: {
          courseId: link.courseId,
          inviteeId: input.userId,
          status: CourseInvitationStatus.PENDING,
        },
        data: {
          acceptedAt: new Date(),
          status: CourseInvitationStatus.ACCEPTED,
        },
      });

      return { courseId: link.courseId, message: 'Joined course' };
    });
  }
}
