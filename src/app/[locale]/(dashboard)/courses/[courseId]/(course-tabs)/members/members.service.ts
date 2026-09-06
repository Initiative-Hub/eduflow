import { apiClient } from '@/lib/api';
import type {
  AddCourseMemberInput,
  CourseInviteLinksResponse,
  CourseMemberCandidatesResponse,
  CourseMemberMutationResponse,
  CourseMemberRoleFilter,
  CourseMembersResponse,
  CreateCourseInviteLinkInput,
  UpdateCourseMemberInput,
} from './members.config';

type ListMembersParams = {
  courseId: string;
  search?: string;
  role: CourseMemberRoleFilter;
  limit: number;
  offset: number;
};

type ListCandidatesParams = {
  courseId: string;
  search?: string;
  limit: number;
  offset: number;
};

const buildSearchParams = (
  params: Record<string, string | number | null | undefined>
) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    searchParams.set(key, String(value));
  }

  return searchParams;
};

export const courseMembersService = {
  listMembers: async ({
    courseId,
    search,
    role,
    limit,
    offset,
  }: ListMembersParams) => {
    const searchParams = buildSearchParams({ search, role, limit, offset });
    const queryString = searchParams.toString();

    return apiClient.get<CourseMembersResponse>(
      `v1/courses/${courseId}/members${queryString ? `?${queryString}` : ''}`,
      { headers: { 'Cache-Control': 'no-store' } }
    );
  },

  listCandidates: async ({
    courseId,
    search,
    limit,
    offset,
  }: ListCandidatesParams) => {
    const searchParams = buildSearchParams({ search, limit, offset });
    const queryString = searchParams.toString();

    return apiClient.get<CourseMemberCandidatesResponse>(
      `v1/courses/${courseId}/members/candidates${
        queryString ? `?${queryString}` : ''
      }`,
      { headers: { 'Cache-Control': 'no-store' } }
    );
  },

  addMember: async (courseId: string, input: AddCourseMemberInput) => {
    return apiClient.post<CourseMemberMutationResponse>(
      `v1/courses/${courseId}/members`,
      input
    );
  },

  inviteMember: async (courseId: string, input: AddCourseMemberInput) => {
    return apiClient.post<CourseMemberMutationResponse>(
      `v1/courses/${courseId}/members/invitations`,
      input
    );
  },

  updateMember: async (courseId: string, input: UpdateCourseMemberInput) => {
    return apiClient.patch<CourseMemberMutationResponse>(
      `v1/courses/${courseId}/members/${input.memberId}`,
      { role: input.role }
    );
  },

  removeMember: async (courseId: string, memberId: string) => {
    return apiClient.delete<CourseMemberMutationResponse>(
      `v1/courses/${courseId}/members/${memberId}`
    );
  },

  listInviteLinks: async (courseId: string) => {
    return apiClient.get<CourseInviteLinksResponse>(
      `v1/courses/${courseId}/invite-links`,
      { headers: { 'Cache-Control': 'no-store' } }
    );
  },

  createInviteLink: async (
    courseId: string,
    input: CreateCourseInviteLinkInput
  ) => {
    return apiClient.post(`v1/courses/${courseId}/invite-links`, input);
  },

  revokeInviteLink: async (courseId: string, inviteId: string) => {
    return apiClient.delete<CourseMemberMutationResponse>(
      `v1/courses/${courseId}/invite-links/${inviteId}`
    );
  },
};
