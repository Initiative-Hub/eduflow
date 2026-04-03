'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { signUp } from '@/lib/auth-client';
import type { RegisterFormData } from './register.config';

export function useRegister() {
  const router = useRouter();

  const mutation = useMutation<void, Error, RegisterFormData>({
    mutationFn: async (formData: RegisterFormData) => {
      const { error } = await signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.fullname,
      });

      if (error) {
        throw new Error(error.message || 'Registration failed');
      }
    },
    onSuccess: () => {
      router.replace(`/dashboard`);
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    error: mutation.error?.message || '',
    isLoading: mutation.isPending,
    handleSubmit: mutation.mutate,
  };
}
