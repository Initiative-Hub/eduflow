import { apiClient } from '@/lib/api';
import type {
  RolePermissionsResponse,
  RolePermissionUpdateResponse,
  UpdateRolePermissionInput,
} from './roles.config';

export const rolesService = {
  getPermissions: async () => {
    return apiClient.get<RolePermissionsResponse>('/admin/roles/permissions');
  },
  updatePermissions: async (data: UpdateRolePermissionInput) => {
    return apiClient.patch<RolePermissionUpdateResponse>(
      '/admin/roles/permissions',
      data
    );
  },
};
