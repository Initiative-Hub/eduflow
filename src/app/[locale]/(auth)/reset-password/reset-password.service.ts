import { apiClient } from '@/lib/api';

export type ResetPasswordResult = {
  success: boolean;
};

export const resetPasswordService = {
  resetPassword: async (
    password: string,
    token: string
  ): Promise<ResetPasswordResult> => {
    await apiClient.post('/auth/reset-password', { password, token });
    return {
      success: true,
    };
  },
};
