import { apiClient } from '@/lib/api';

type VerifyOtpPayload = {
  email: string;
  otp: string;
};

type ResendOtpPayload = {
  email: string;
};

export const verifyOtpService = {
  verifyOtp: async (data: VerifyOtpPayload) => {
    return apiClient.post('/auth/verify-otp', data);
  },
  resendOtp: async (data: ResendOtpPayload) => {
    return apiClient.post('/auth/resend-otp', data);
  },
};
