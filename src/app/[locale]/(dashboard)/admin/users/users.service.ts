import { apiClient } from '@/lib/api';
import type {
  AdminUser,
  AdminUserCreateInput,
  AdminUserMutationResponse,
  AdminUserUpdateInput,
} from './users.config';

export const usersService = {
  list: async () => {
    return apiClient.get<AdminUser[]>('/admin/users', {
      headers: { 'Cache-Control': 'no-store' },
    });
  },
  create: async (data: AdminUserCreateInput) => {
    return apiClient.post<AdminUserMutationResponse>('/admin/users', {
      email: data.email,
      password: data.password,
      name: data.name || undefined,
      role: data.role,
    });
  },
  update: async (data: AdminUserUpdateInput) => {
    return apiClient.put<AdminUserMutationResponse>('/admin/users', data);
  },
};
