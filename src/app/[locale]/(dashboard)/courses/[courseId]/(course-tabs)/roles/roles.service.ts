import { apiClient } from '@/lib/api';
import type {
  CourseRolePermissionsResponse,
  CourseRolePermissionUpdateResponse,
  UpdateCourseRolePermissionInput,
} from './roles.config';

export const rolesService = {
  getPermissions: async (courseId: string) => {
    return apiClient.get<CourseRolePermissionsResponse>(
      `/v1/courses/${courseId}/roles/permissions`
    );
  },
  updatePermissions: async (
    courseId: string,
    data: UpdateCourseRolePermissionInput
  ) => {
    return apiClient.patch<CourseRolePermissionUpdateResponse>(
      `/v1/courses/${courseId}/roles/permissions`,
      data
    );
  },
};
