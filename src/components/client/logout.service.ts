import { apiClient } from '@/lib/api';

export const logoutService = {
  logout: async () => {
    return apiClient.post('/auth/logout');
  },
};
