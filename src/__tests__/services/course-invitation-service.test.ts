import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CourseEnrollmentStatus,
  CourseInvitationStatus,
} from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { CourseInvitationService } from '@/services/CourseInvitationService';

vi.mock('@/lib/api/endpoints', () => ({
  APP_URL: 'https://eduflow.test',
}));

vi.mock('@/lib/email-service', () => ({
  emailService: {
    sendCourseInvitation: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    course: {
      findUnique: vi.fn(),
    },
    courseInvitation: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    courseInviteLink: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    enrollment: {
      count: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

const prismaMock = prisma as unknown as {
  $transaction: ReturnType<typeof vi.fn>;
  course: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  courseInvitation: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  courseInviteLink: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  enrollment: {
    count: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
};

describe('CourseInvitationService capacity checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns capacity_full when a direct invitation is accepted after capacity is reached', async () => {
    prismaMock.courseInvitation.findUnique.mockResolvedValue({
      course: { deletedAt: null, id: 'course-1' },
      courseId: 'course-1',
      expiresAt: null,
      id: 'invitation-1',
      inviteeId: 'user-1',
      roleId: 'role-student',
      status: CourseInvitationStatus.PENDING,
    });
    prismaMock.$transaction.mockImplementation(async (operation) => {
      if (Array.isArray(operation)) return Promise.all(operation);
      return operation(prismaMock);
    });
    prismaMock.course.findUnique.mockResolvedValue({ capacity: 50 });
    prismaMock.enrollment.count.mockResolvedValue(50);

    const result = await CourseInvitationService.acceptDirectInvitation({
      invitationId: 'invitation-1',
      userId: 'user-1',
    });

    expect(result).toEqual({
      ok: false,
      reason: 'capacity_full',
      courseId: 'course-1',
    });
    expect(prismaMock.enrollment.upsert).not.toHaveBeenCalled();
    expect(prismaMock.courseInvitation.update).not.toHaveBeenCalled();
  });

  it('rejects public invite link joins after capacity is reached', async () => {
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(prismaMock)
    );
    prismaMock.courseInviteLink.findUnique.mockResolvedValue({
      course: { deletedAt: null, id: 'course-1' },
      courseId: 'course-1',
      expiresAt: null,
      id: 'link-1',
      maxUses: 100,
      revokedAt: null,
      role: { id: 'role-student' },
      roleId: 'role-student',
      usedCount: 0,
    });
    prismaMock.enrollment.findUnique.mockResolvedValue({
      status: CourseEnrollmentStatus.PENDING_INVITE,
    });
    prismaMock.course.findUnique.mockResolvedValue({ capacity: 50 });
    prismaMock.enrollment.count.mockResolvedValue(50);

    await expect(
      CourseInvitationService.joinByPublicInviteLink({
        inviteId: 'link-1',
        userId: 'user-1',
      })
    ).rejects.toThrow('Course capacity reached');
    expect(prismaMock.enrollment.upsert).not.toHaveBeenCalled();
  });

  it('marks the public invite view unavailable for an active course member', async () => {
    prismaMock.courseInviteLink.findUnique.mockResolvedValue({
      course: {
        capacity: null,
        deletedAt: null,
        id: 'course-1',
        title: 'English 101',
      },
      expiresAt: null,
      maxUses: 100,
      revokedAt: null,
      usedCount: 0,
    });
    prismaMock.course.findUnique.mockResolvedValue({ capacity: null });
    prismaMock.enrollment.count.mockResolvedValue(12);
    prismaMock.enrollment.findUnique.mockResolvedValue({
      status: CourseEnrollmentStatus.ACTIVE,
    });

    const result = await CourseInvitationService.getPublicInviteView(
      'link-1',
      'user-1'
    );

    expect(result.isAlreadyJoined).toBe(true);
    expect(prismaMock.enrollment.findUnique).toHaveBeenCalledWith({
      where: {
        courseId_memberId: {
          courseId: 'course-1',
          memberId: 'user-1',
        },
      },
      select: { status: true },
    });
  });

  it('does not overwrite enrollment when an active member joins through a public invite link', async () => {
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(prismaMock)
    );
    prismaMock.courseInviteLink.findUnique.mockResolvedValue({
      course: { deletedAt: null, id: 'course-1' },
      courseId: 'course-1',
      expiresAt: null,
      id: 'link-1',
      maxUses: 100,
      revokedAt: null,
      role: { id: 'role-student' },
      roleId: 'role-student',
      usedCount: 0,
    });
    prismaMock.enrollment.findUnique.mockResolvedValue({
      status: CourseEnrollmentStatus.ACTIVE,
    });

    const result = await CourseInvitationService.joinByPublicInviteLink({
      inviteId: 'link-1',
      userId: 'user-1',
    });

    expect(result).toEqual({
      courseId: 'course-1',
      message: 'Already joined course',
    });
    expect(prismaMock.course.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.enrollment.count).not.toHaveBeenCalled();
    expect(prismaMock.enrollment.upsert).not.toHaveBeenCalled();
    expect(prismaMock.courseInviteLink.update).not.toHaveBeenCalled();
    expect(prismaMock.courseInvitation.updateMany).not.toHaveBeenCalled();
  });
});
