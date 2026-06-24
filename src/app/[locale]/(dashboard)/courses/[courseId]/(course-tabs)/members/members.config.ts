import type { PlatformRoleName } from '@/generated/prisma';

export const COURSE_MEMBERS_QUERY_KEY = (courseId: string) =>
  ['course', courseId, 'members'] as const;

export const COURSE_MEMBERS_PAGE_SIZE_OPTIONS = ['10', '20', '50'] as const;

export const COURSE_MEMBER_ROLE_OPTIONS = [
  'COURSE_OWNER',
  'TEACHER',
  'STUDENT',
] as const;

export const ASSIGNABLE_COURSE_MEMBER_ROLES = ['TEACHER', 'STUDENT'] as const;

export const COURSE_MEMBER_CANDIDATE_PAGE_SIZE = 20;
export const COURSE_MEMBER_SEARCH_DEBOUNCE_MS = 300;

export type CourseMemberRole = (typeof COURSE_MEMBER_ROLE_OPTIONS)[number];
export type AssignableCourseMemberRole =
  (typeof ASSIGNABLE_COURSE_MEMBER_ROLES)[number];
export type CourseMemberRoleFilter = CourseMemberRole | 'ALL';

export type CourseMemberUser = {
  id: string;
  email: string;
  image: string | null;
  name: string;
  role: CourseMemberRole;
};

export type CourseMember = {
  enrollmentId: string;
  enrolledAt: string | null;
  isCourseOwner: boolean;
  isCurrentUser: boolean;
  user: CourseMemberUser;
};

export type CourseMemberCandidate = {
  id: string;
  email: string;
  image: string | null;
  name: string;
  role: PlatformRoleName;
};

export type PaginationMeta = {
  total: number;
  limit: number;
  offset: number;
};

export type CourseMembersResponse = {
  data: CourseMember[];
  pagination: PaginationMeta;
  permissions: {
    canManageMembers: boolean;
  };
};

export type CourseMemberCandidatesResponse = {
  data: CourseMemberCandidate[];
  pagination: PaginationMeta;
};

export type CourseMemberMutationResponse = {
  message: string;
  id: string;
};

export type AddCourseMemberInput = {
  userId: string;
  role: AssignableCourseMemberRole;
};

export type UpdateCourseMemberInput = {
  memberId: string;
  role: AssignableCourseMemberRole;
};

export function getCourseMemberInitials(
  name?: string | null,
  email?: string | null
) {
  const displayName = name || email || '';

  return (
    displayName
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'
  );
}

export function isCourseMemberRoleLocked(member: CourseMember) {
  return member.isCourseOwner;
}

export function isCourseMemberRemovalLocked(member: CourseMember) {
  return member.isCourseOwner || member.isCurrentUser;
}
