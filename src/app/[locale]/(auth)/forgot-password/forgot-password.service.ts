import { apiClient } from '@/lib/api';

export type ForgotPasswordResetResult = {
  success?: true;
  email: string;
};

export const forgotPasswordService = {
  resetPassword: async (email: string): Promise<ForgotPasswordResetResult> => {
    await apiClient.post('/auth/forgot-password', { email });

    return {
      success: true,
      email,
    };
  },
};
