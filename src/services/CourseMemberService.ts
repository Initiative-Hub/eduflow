import {
  CourseRoleName,
  type CourseRoleName as CourseRoleNameType,
  PlatformRoleName,
  type Prisma,
} from '@/generated/prisma';
import { prisma } from '@/lib/prisma';

const MIN_CANDIDATE_SEARCH_LENGTH = 2;
const ELIGIBLE_COURSE_MEMBER_PLATFORM_ROLES = [
  PlatformRoleName.TEACHER,
  PlatformRoleName.STUDENT,
] as const;

function isEligibleCourseMemberPlatformRole(role?: PlatformRoleName | null) {
  return role === PlatformRoleName.TEACHER || role === PlatformRoleName.STUDENT;
}

export const ASSIGNABLE_COURSE_MEMBER_ROLES = [
  CourseRoleName.TEACHER,
  CourseRoleName.STUDENT,
] as const;

export type AssignableCourseMemberRole =
  (typeof ASSIGNABLE_COURSE_MEMBER_ROLES)[number];

export type CourseMemberRoleFilter = CourseRoleNameType | 'ALL';

export type CourseMemberListInput = {
  courseId: string;
  currentUserId: string;
  search?: string;
  role?: CourseMemberRoleFilter;
  limit: number;
  offset: number;
};

export type CourseMemberCandidateListInput = {
  courseId: string;
  search?: string;
  limit: number;
  offset: number;
};

export type CourseMemberMutationResponse = {
  message: string;
  id: string;
};

export type CourseMemberUserView = {
  id: string;
  email: string;
  image: string | null;
  name: string;
  role: CourseRoleNameType;
};

export type CourseMemberView = {
  enrollmentId: string;
  enrolledAt: string;
  isCourseOwner: boolean;
  isCurrentUser: boolean;
  user: CourseMemberUserView;
};

export type CourseMemberCandidateView = CourseMemberUserView & {
  alreadyMember: boolean;
};

function normalizeSearch(search?: string) {
  const trimmedSearch = search?.trim();
  return trimmedSearch ? trimmedSearch : undefined;
}

function buildCandidateUserUserWhere({
  courseId,
  search,
}: Pick<CourseMemberCandidateListInput, 'courseId' | 'search'>) {
  const normalizedSearch = normalizeSearch(search);

  if (
    !normalizedSearch ||
    normalizedSearch.length < MIN_CANDIDATE_SEARCH_LENGTH
  )
    return null;

  return {
    emailVerified: true,
    role: {
      is: {
        name: { in: [...ELIGIBLE_COURSE_MEMBER_PLATFORM_ROLES] },
      },
    },
    enrollments: {
      none: { courseId },
    },
    OR: [
      { name: { contains: normalizedSearch, mode: 'insensitive' } },
      { email: { contains: normalizedSearch, mode: 'insensitive' } },
    ],
  } satisfies Prisma.UserWhereInput;
}

function buildEnrollmentWhere({
  courseId,
  search,
  role,
}: Pick<CourseMemberListInput, 'courseId' | 'role' | 'search'>) {
  const normalizedSearch = normalizeSearch(search);
  const where: Prisma.EnrollmentWhereInput = { courseId };

  if (role && role !== 'ALL') {
    where.role = { name: role };
  }

  if (normalizedSearch) {
    where.OR = [
      {
        member: {
          name: { contains: normalizedSearch, mode: 'insensitive' },
        },
      },
      {
        member: {
          email: { contains: normalizedSearch, mode: 'insensitive' },
        },
      },
      {
        memberId: { contains: normalizedSearch, mode: 'insensitive' },
      },
    ];
  }

  return where;
}

function assertAssignableRole(role: CourseRoleNameType) {
  if (role === CourseRoleName.COURSE_OWNER) {
    throw new Error('Cannot assign the course owner role');
  }

  if (
    !ASSIGNABLE_COURSE_MEMBER_ROLES.includes(role as AssignableCourseMemberRole)
  ) {
    throw new Error('Invalid course member role');
  }
}

export class CourseMemberService {
  static async listMembers(input: CourseMemberListInput) {
    const where = buildEnrollmentWhere(input);
    const [total, enrollments] = await Promise.all([
      prisma.enrollment.count({ where }),
      prisma.enrollment.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              email: true,
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
        skip: input.offset,
        take: input.limit,
      }),
    ]);

    return {
      data: enrollments.map((enrollment): CourseMemberView => {
        const role = enrollment.role.name;

        return {
          enrollmentId: enrollment.id,
          enrolledAt: enrollment.enrolledAt.toISOString(),
          isCourseOwner: role === CourseRoleName.COURSE_OWNER,
          isCurrentUser: enrollment.member.id === input.currentUserId,
          user: {
            id: enrollment.member.id,
            email: enrollment.member.email,
            image: enrollment.member.image,
            name: enrollment.member.name,
            role,
          },
        };
      }),
      pagination: {
        total,
        limit: input.limit,
        offset: input.offset,
      },
    };
  }

  static async listCandidates(input: CourseMemberCandidateListInput) {
    const where = buildCandidateUserUserWhere(input);

    if (!where) {
      return {
        data: [],
        pagination: {
          total: 0,
          limit: input.limit,
          offset: input.offset,
        },
      };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: { id: true, email: true, image: true, name: true },
        orderBy: [{ name: 'asc' }, { email: 'asc' }],
        skip: input.offset,
        take: input.limit,
      }),
    ]);

    return {
      data: users.map((user) => ({
        id: user.id,
        alreadyMember: false,
        email: user.email,
        image: user.image,
        name: user.name,
        role: CourseRoleName.STUDENT,
      })),
      pagination: {
        total,
        limit: input.limit,
        offset: input.offset,
      },
    };
  }

  static async addMember(input: {
    courseId: string;
    userId: string;
    role: CourseRoleNameType;
  }): Promise<CourseMemberMutationResponse> {
    assertAssignableRole(input.role);

    const targetUser = await prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        emailVerified: true,
        role: { select: { name: true } },
      },
    });

    if (
      !targetUser?.emailVerified ||
      !isEligibleCourseMemberPlatformRole(targetUser.role?.name)
    )
      throw Error('User cannot be added to courses');

    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        courseId: input.courseId,
        memberId: input.userId,
      },
      select: { id: true },
    });

    if (existingEnrollment) {
      throw new Error('User is already a course member');
    }

    const courseRole = await prisma.courseRole.findUnique({
      where: { name: input.role },
      select: { id: true },
    });

    if (!courseRole) {
      throw new Error('Course role not found');
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        courseId: input.courseId,
        memberId: input.userId,
        roleId: courseRole.id,
      },
      select: { id: true },
    });

    return { message: 'Member added', id: enrollment.id };
  }

  static async updateMemberRole(input: {
    courseId: string;
    memberId: string;
    role: CourseRoleNameType;
  }): Promise<CourseMemberMutationResponse> {
    assertAssignableRole(input.role);

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        courseId: input.courseId,
        memberId: input.memberId,
      },
      select: {
        courseId: true,
        id: true,
        memberId: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new Error('Course member not found');
    }

    if (enrollment.role.name === CourseRoleName.COURSE_OWNER) {
      throw new Error('Course owner role cannot be changed');
    }

    const courseRole = await prisma.courseRole.findUnique({
      where: { name: input.role },
      select: { id: true },
    });

    if (!courseRole) {
      throw new Error('Course role not found');
    }

    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { roleId: courseRole.id },
      select: { id: true },
    });

    return { message: 'Member updated', id: updatedEnrollment.id };
  }

  static async removeMember(input: {
    courseId: string;
    memberId: string;
    currentUserId: string;
  }): Promise<CourseMemberMutationResponse> {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        courseId: input.courseId,
        memberId: input.memberId,
      },
      select: {
        courseId: true,
        id: true,
        memberId: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new Error('Course member not found');
    }

    if (enrollment.role.name === CourseRoleName.COURSE_OWNER) {
      throw new Error('Course owner cannot be removed');
    }

    if (enrollment.memberId === input.currentUserId) {
      throw new Error('You cannot remove yourself from the course');
    }

    await prisma.enrollment.delete({
      where: { id: enrollment.id },
      select: { id: true },
    });

    return { message: 'Member removed', id: enrollment.id };
  }
}
