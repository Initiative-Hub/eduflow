'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api/error-response';
import type { ResetPasswordFormData } from './reset-password.config';
import {
  type ResetPasswordResult,
  resetPasswordService,
} from './reset-password.service';

export function useResetPassword(token: string) {
  const router = useRouter();

  const mutation = useMutation<
    ResetPasswordResult,
    ApiError,
    ResetPasswordFormData
  >({
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
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    handleSubmit: (values: ResetPasswordFormData) => mutation.mutate(values),
  };
}
