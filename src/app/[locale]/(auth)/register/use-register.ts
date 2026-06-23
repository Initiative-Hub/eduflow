'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DEV_MODE, LOCAL_MAILPIT_URL } from '@/constants/common';
import type { ApiError } from '@/lib/api';
import type { RegisterFormData } from './register.config';
import { registerService } from './register.service';

export function useRegister() {
  const router = useRouter();

  const mutation = useMutation<void, ApiError, RegisterFormData>({
    mutationFn: async (formData: RegisterFormData) => {
      await registerService.register({
        email: formData.email,
        password: formData.password,
        name: formData.fullname,
      });
    },
    onSuccess: (_, variables) => {
      if (DEV_MODE) {
        window.open(LOCAL_MAILPIT_URL, '_blank');
      }

      router.replace(
        `/verify-otp?email=${encodeURIComponent(variables.email)}`
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    error: mutation.error?.message || '',
    isLoading: mutation.isPending,
    handleSubmit: mutation.mutate,
  };
}
