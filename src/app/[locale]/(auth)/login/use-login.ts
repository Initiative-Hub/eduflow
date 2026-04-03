'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth-client';
import type { LoginFormData } from './login.config';

export function useLogin() {
  const router = useRouter();

  const mutation = useMutation<void, Error, LoginFormData>({
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

  return {
    error: mutation.error?.message || '',
    isLoading: mutation.isPending,
    handleSubmit: mutation.mutate,
  };
}
