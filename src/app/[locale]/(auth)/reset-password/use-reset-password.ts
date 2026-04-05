'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ResetPasswordFormData } from './reset-password.config';
import { resetPasswordService } from './reset-password.service';

export function useResetPassword(token: string) {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async ({ password }: ResetPasswordFormData) => {
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
  };
}
