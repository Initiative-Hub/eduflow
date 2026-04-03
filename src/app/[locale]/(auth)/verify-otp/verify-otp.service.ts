import { authClient } from '@/lib/auth-client';

type VerifyOtpPayload = {
  email: string;
  otp: string;
};

type ResendOtpPayload = {
  email: string;
};

export const verifyOtpService = {
  verifyOtp: async (data: VerifyOtpPayload) => {
    const { data: result, error } = await authClient.emailOtp.verifyEmail({
      email: data.email,
      otp: data.otp,
    });
    if (error) throw error;
    return result;
  },
  resendOtp: async (data: ResendOtpPayload) => {
    const { data: result, error } =
      await authClient.emailOtp.sendVerificationOtp({
        email: data.email,
        type: 'email-verification',
      });
    if (error) throw error;
    return result;
  },
};
