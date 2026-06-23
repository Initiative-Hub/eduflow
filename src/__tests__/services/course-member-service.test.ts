import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseRoleName } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { CourseMemberService } from '@/services/CourseMemberService';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    courseRole: {
      findUnique: vi.fn(),
    },
    enrollment: {
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      count: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const prismaMock = prisma as unknown as {
  courseRole: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  enrollment: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  user: {
    count: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe('CourseMemberService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists members with server-side search, role filter, limit, and offset', async () => {
    const enrolledAt = new Date('2026-01-01T00:00:00.000Z');
    prismaMock.enrollment.count.mockResolvedValue(1);
    prismaMock.enrollment.findMany.mockResolvedValue([
      {
        id: 'enrollment-1',
        enrolledAt,
        member: {
          id: 'user-1',
          email: 'teacher@example.com',
          image: null,
          name: 'Teacher One',
        },
        role: { name: CourseRoleName.TEACHER },
      },
    ]);

    const result = await CourseMemberService.listMembers({
      courseId: 'course-1',
      currentUserId: 'user-current',
      search: 'teacher',
      role: CourseRoleName.TEACHER,
      limit: 10,
      offset: 20,
    });

    expect(prismaMock.enrollment.count).toHaveBeenCalledWith({
      where: {
        courseId: 'course-1',
        role: { name: CourseRoleName.TEACHER },
        OR: [
          { member: { name: { contains: 'teacher', mode: 'insensitive' } } },
          { member: { email: { contains: 'teacher', mode: 'insensitive' } } },
          { memberId: { contains: 'teacher', mode: 'insensitive' } },
        ],
      },
    });
    expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    );
    expect(result).toEqual({
      data: [
        {
          enrollmentId: 'enrollment-1',
          enrolledAt: enrolledAt.toISOString(),
          isCourseOwner: false,
          isCurrentUser: false,
          user: {
            id: 'user-1',
            email: 'teacher@example.com',
            image: null,
            name: 'Teacher One',
            role: CourseRoleName.TEACHER,
          },
        },
      ],
      pagination: {
        limit: 10,
        offset: 20,
        total: 1,
      },
    });
  });

  it('paginates eligible candidate users for the course', async () => {
    prismaMock.user.count.mockResolvedValue(2);
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'user-2',
        email: 'candidate@example.com',
        image: null,
        name: 'Candidate User',
      },
      {
        id: 'user-3',
        email: 'teacher-user@example.com',
        image: null,
        name: 'Teacher User',
      },
    ]);

    const result = await CourseMemberService.listCandidates({
      courseId: 'course-1',
      search: 'user',
      limit: 20,
      offset: 0,
    });

    expect(prismaMock.user.count).toHaveBeenCalledWith({
      where: {
        emailVerified: true,
        role: {
          is: {
            name: { in: ['TEACHER', 'STUDENT'] },
          },
        },
        enrollments: {
          none: { courseId: 'course-1' },
        },
        OR: [
          { name: { contains: 'user', mode: 'insensitive' } },
          { email: { contains: 'user', mode: 'insensitive' } },
        ],
      },
    });
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
      })
    );
    expect(result.data).toEqual([
      {
        alreadyMember: false,
        email: 'candidate@example.com',
        id: 'user-2',
        image: null,
        name: 'Candidate User',
        role: CourseRoleName.STUDENT,
      },
      {
        alreadyMember: false,
        email: 'teacher-user@example.com',
        id: 'user-3',
        image: null,
        name: 'Teacher User',
        role: CourseRoleName.STUDENT,
      },
    ]);
  });

  it('rejects adding duplicate members and the course owner role', async () => {
    await expect(
      CourseMemberService.addMember({
        courseId: 'course-1',
        userId: 'user-1',
        role: CourseRoleName.COURSE_OWNER,
      })
    ).rejects.toThrow('Cannot assign the course owner role');

    prismaMock.enrollment.findFirst.mockResolvedValue({ id: 'enrollment-1' });
    prismaMock.user.findUnique.mockResolvedValue({
      emailVerified: true,
      role: { name: 'STUDENT' },
    });

    await expect(
      CourseMemberService.addMember({
        courseId: 'course-1',
        userId: 'user-1',
        role: CourseRoleName.STUDENT,
      })
    ).rejects.toThrow('User is already a course member');
  });

  it('rejects editing course owner enrollment role', async () => {
    prismaMock.enrollment.findFirst.mockResolvedValue({
      id: 'enrollment-1',
      courseId: 'course-1',
      memberId: 'owner-user',
      role: { name: CourseRoleName.COURSE_OWNER },
    });

    await expect(
      CourseMemberService.updateMemberRole({
        courseId: 'course-1',
        memberId: 'owner-user',
        role: CourseRoleName.STUDENT,
      })
    ).rejects.toThrow('Course owner role cannot be changed');
  });

  it('rejects removing course owner and current user enrollment', async () => {
    prismaMock.enrollment.findFirst.mockResolvedValueOnce({
      id: 'enrollment-owner',
      courseId: 'course-1',
      memberId: 'owner-user',
      role: { name: CourseRoleName.COURSE_OWNER },
    });

    await expect(
      CourseMemberService.removeMember({
        courseId: 'course-1',
        memberId: 'owner-user',
        currentUserId: 'manager-user',
      })
    ).rejects.toThrow('Course owner cannot be removed');

    prismaMock.enrollment.findFirst.mockResolvedValueOnce({
      id: 'enrollment-self',
      courseId: 'course-1',
      memberId: 'manager-user',
      role: { name: CourseRoleName.TEACHER },
    });

    await expect(
      CourseMemberService.removeMember({
        courseId: 'course-1',
        memberId: 'manager-user',
        currentUserId: 'manager-user',
      })
    ).rejects.toThrow('You cannot remove yourself from the course');
  });

  it('rejects updates and removals when the member is not found in the course', async () => {
    prismaMock.enrollment.findFirst.mockResolvedValueOnce(null);

    await expect(
      CourseMemberService.updateMemberRole({
        courseId: 'course-1',
        memberId: 'user-1',
        role: CourseRoleName.TEACHER,
      })
    ).rejects.toThrow('Course member not found');
    expect(prismaMock.enrollment.update).not.toHaveBeenCalled();

    prismaMock.enrollment.findFirst.mockResolvedValueOnce(null);

    await expect(
      CourseMemberService.removeMember({
        courseId: 'course-1',
        memberId: 'user-1',
        currentUserId: 'manager-user',
      })
    ).rejects.toThrow('Course member not found');
    expect(prismaMock.enrollment.delete).not.toHaveBeenCalled();
  });
});
