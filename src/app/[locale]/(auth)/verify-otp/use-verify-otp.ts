'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ApiError } from '@/lib/api';
import { verifyOtpService } from './verify-otp.service';

type VerifyOtpPayload = {
  email: string;
  otp: string;
};

const RESEND_COOLDOWN_SECONDS = 60;

export function useVerifyOtp() {
  const router = useRouter();
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldownSeconds((currentValue) => Math.max(currentValue - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const verifyMutation = useMutation<void, ApiError, VerifyOtpPayload>({
    mutationFn: async (data) => {
      await verifyOtpService.verifyOtp(data);
    },
    onSuccess: () => {
      router.replace('/login');
    },
  });

  const resendMutation = useMutation<void, ApiError, { email: string }>({
    mutationFn: async ({ email }) => {
      await verifyOtpService.resendOtp({ email });
    },
    onSuccess: () => {
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
    },
  });

  const handleResend = (email: string) => {
    if (cooldownSeconds > 0 || resendMutation.isPending || !email) {
      return;
    }

    resendMutation.mutate({ email });
  };

  return {
    error: verifyMutation.error?.message || resendMutation.error?.message || '',
    isVerifying: verifyMutation.isPending,
    isResending: resendMutation.isPending,
    cooldownSeconds,
    handleVerify: verifyMutation.mutate,
    handleResend,
  };
}
