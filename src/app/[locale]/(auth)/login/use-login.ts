'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { ApiError } from '@/lib/api';
import type { LoginFormData } from './login.config';
import { loginService } from './login.service';

export function useLogin() {
  const router = useRouter();

  const emailMutation = useMutation<void, ApiError, LoginFormData>({
    mutationFn: async (formData: LoginFormData) => {
      await loginService.login(formData);
    },
    onSuccess: () => {
      router.replace('/dashboard');
    },
  });

  const googleMutation = useMutation<void, ApiError, void>({
    mutationFn: async () => {
      const result = await loginService.signInWithSocial('google');

      if (!result.url) {
        throw {
          message: 'Failed to sign in with Google. Please try again.',
        } satisfies ApiError;
      }

      window.location.assign(result.url);
    },
  });

  return {
    error: emailMutation.error?.message || '',
    isLoading: emailMutation.isPending,
    handleSubmit: emailMutation.mutate,

    googleError: googleMutation.error?.message || '',
    isGoogleLoading: googleMutation.isPending,
    handleGoogleLogin: () => googleMutation.mutate(),
  };
}
