'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api';
import type { ForgotPasswordFormData } from './forgot-password.config';
import {
  type ForgotPasswordResetResult,
  forgotPasswordService,
} from './forgot-password.service';

export function useForgotPassword() {
  const mutation = useMutation<
    ForgotPasswordResetResult,
    ApiError,
    ForgotPasswordFormData
  >({
    mutationFn: async ({ email }: ForgotPasswordFormData) => {
      return forgotPasswordService.resetPassword(email);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    submittedEmail: mutation.data?.email || '',
    error: mutation.error?.message || '',
    isLoading: mutation.isPending,
    handleSubmit: mutation.mutate,
  };
}
