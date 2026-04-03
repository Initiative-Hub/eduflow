import { apiClient } from '@/lib/api';

export const registerService = {
  register: async (data: { email: string; password: string; name: string }) => {
    return apiClient.post('/auth/register', data);
  },
  sendVerificationOtp: async (email: string) => {
    return apiClient.post('/auth/resend-otp', {
      email,
    });
  },
};
