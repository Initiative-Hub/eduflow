import { apiClient } from '@/lib/api/api-client';

export const roleService = {
  updateRole: async (role: 'STUDENT' | 'TEACHER') => {
    return apiClient.put('/v1/user/role', { role });
  },
};
