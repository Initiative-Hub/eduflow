'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth-client';
import type { LoginFormData } from './login.config';

export function useLogin() {
  const router = useRouter();

  const emailMutation = useMutation<void, Error, LoginFormData>({
    mutationFn: async (formData: LoginFormData) => {
      const { error } = await signIn.email({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        throw new Error('Invalid email or password. Please try again.');
      }
    },
    onSuccess: () => {
      router.replace('/dashboard');
    },
  });

  const googleMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      const { error } = await signIn.social({
        provider: 'google',
        callbackURL: '/dashboard',
      });

      if (error) {
        throw new Error('Failed to sign in with Google. Please try again.');
      }
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
