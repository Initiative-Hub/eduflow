import { apiClient } from '@/lib/api';

export const registerService = {
  register: async (data: { email: string; password: string }) => {
    return apiClient.post('/auth/register', data);
  },
};
