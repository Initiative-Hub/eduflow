import { apiClient } from '@/lib/api';
import type {
  CourseSettingsMutationResponse,
  CourseSettingsResponse,
  CourseSettingsUpdateInput,
} from './settings.config';

export const courseSettingsService = {
  getOverview: async (courseId: string) => {
    return apiClient.get<CourseSettingsResponse>(
      `v1/courses/${courseId}/overview`,
      { headers: { 'Cache-Control': 'no-store' } }
    );
  },

  updateOverview: async (
    courseId: string,
    input: CourseSettingsUpdateInput
  ) => {
    return apiClient.patch(`v1/courses/${courseId}/overview`, input);
  },

  leaveCourse: async (courseId: string) => {
    return apiClient.post<CourseSettingsMutationResponse>(
      `v1/courses/${courseId}/leave`
    );
  },

  transferOwnership: async (courseId: string, newOwnerUserId: string) => {
    return apiClient.patch<CourseSettingsMutationResponse>(
      `v1/courses/${courseId}/ownership`,
      { newOwnerUserId }
    );
  },

  archiveCourse: async (courseId: string, confirmationCourseId: string) => {
    return apiClient.post<CourseSettingsMutationResponse>(
      `v1/courses/${courseId}/archive`,
      { confirmationCourseId }
    );
  },

  unarchiveCourse: async (courseId: string) => {
    return apiClient.post<CourseSettingsMutationResponse>(
      `v1/courses/${courseId}/unarchive`
    );
  },

  deleteCourse: async (courseId: string, confirmationCourseId: string) => {
    return apiClient.post<CourseSettingsMutationResponse>(
      `v1/courses/${courseId}/delete`,
      { confirmationCourseId }
    );
  },
};
