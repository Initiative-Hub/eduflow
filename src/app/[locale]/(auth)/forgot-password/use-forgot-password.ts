'use client';

import { useMutation } from '@tanstack/react-query';
import type { ForgotPasswordFormData } from './forgot-password.config';
import { forgotPasswordService } from './forgot-password.service';

export function useForgotPassword() {
  const mutation = useMutation({
    mutationFn: async ({ email }: ForgotPasswordFormData) => {
      return forgotPasswordService.resetPassword(email);
    },
  });

  return {
    submittedEmail: mutation.data?.email || '',
    error: mutation.error?.message || '',
    isLoading: mutation.isPending,
    handleSubmit: mutation.mutate,
  };
}
