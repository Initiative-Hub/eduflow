'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import type { LoginFormData } from './login.config';

export function useLogin() {
  const router = useRouter();

  const mutation = useMutation<void, Error, LoginFormData>({
    mutationFn: async (data: LoginFormData) => {
      const result = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (result?.error) {
        throw new Error('Invalid email or password. Please try again.');
      }
    },
    onSuccess: () => {
      router.replace('/dashboard');
    },
  });

  return {
    error: mutation.error?.message || '',
    isLoading: mutation.isPending,
    handleSubmit: mutation.mutate,
  };
}
