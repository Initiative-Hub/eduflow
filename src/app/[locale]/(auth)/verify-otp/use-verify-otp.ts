'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LOCAL_MAILPIT_URL } from '@/constants/common';
import type { ApiError } from '@/lib/api';
import { useLoadingStore } from '@/stores/useLoadingStore';
import { verifyOtpService } from './verify-otp.service';

type VerifyOtpPayload = {
  email: string;
  otp: string;
};

const RESEND_COOLDOWN_SECONDS = 60;

export function useVerifyOtp() {
  const router = useRouter();
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const setLoading = useLoadingStore((state) => state.setLoading);
  const isGlobalLoading = useLoadingStore((state) => state.isLoading);

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
      setLoading(true);
      await verifyOtpService.verifyOtp(data);
    },
    onSuccess: () => {
      router.replace('/login');
    },
    onError: () => {
      setLoading(false);
    },
  });

  const resendMutation = useMutation<void, ApiError, { email: string }>({
    mutationFn: async ({ email }) => {
      setLoading(true);
      await verifyOtpService.resendOtp({ email });
    },
    onSuccess: () => {
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      setLoading(false);
    },
    onError: () => {
      setLoading(false);
    },
  });

  const handleResend = (email: string) => {
    if (cooldownSeconds > 0 || resendMutation.isPending || !email) {
      return;
    }

    resendMutation.mutate({ email });
  };

  const openMailpit = () => {
    window.open(LOCAL_MAILPIT_URL, '_blank');
  };

  return {
    error: verifyMutation.error?.message || resendMutation.error?.message || '',
    isVerifying: verifyMutation.isPending || isGlobalLoading,
    isResending: resendMutation.isPending || isGlobalLoading,
    cooldownSeconds,
    handleVerify: verifyMutation.mutate,
    handleResend,
    openMailpit,
  };
}
