'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api';
import type { RegisterFormData } from './register.config';
import { registerService } from './register.service';

export function useRegister() {
  const router = useRouter();

  const mutation = useMutation<void, ApiError, RegisterFormData>({
    mutationFn: async (data: RegisterFormData) => {
      await registerService.register({
        email: data.email,
        password: data.password,
      });
    },
    onSuccess: (_, variables) => {
      const email = encodeURIComponent(variables.email);
      router.replace(`/verify-otp?email=${email}`);
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    error: mutation.error?.message || '',
    isLoading: mutation.isPending,
    handleSubmit: mutation.mutate,
  };
}
