'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { ResetPasswordFormData } from './reset-password.config';
import { resetPasswordService } from './reset-password.service';

export function useResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const mutation = useMutation({
    mutationFn: async ({ password }: ResetPasswordFormData) => {
      if (!token) {
        throw new Error('Invalid or missing token');
      }
      return resetPasswordService.resetPassword(password, token);
    },
    onSuccess: () => {
      toast.success(
        'Password reset successful! You can now sign in with your new password.'
      );
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reset password');
    },
  });

  return {
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    handleSubmit: (values: ResetPasswordFormData) => mutation.mutate(values),
    hasToken: !!token,
  };
}
