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
    mutationFn: async (formData: RegisterFormData) => {
      await registerService.register({
        email: formData.email,
        password: formData.password,
        name: formData.fullname,
      });

      await registerService.sendVerificationOtp(formData.email);
    },
    onSuccess: (_, variables) => {
      router.replace(
        `/verify-otp?email=${encodeURIComponent(variables.email)}`
      );
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    error: mutation.error?.message || '',
    isLoading: mutation.isPending,
    handleSubmit: mutation.mutate,
  };
}
