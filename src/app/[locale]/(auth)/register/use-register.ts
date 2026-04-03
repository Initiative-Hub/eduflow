'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authClient, signUp } from '@/lib/auth-client';
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
    onSuccess: async (_, variables) => {
      await authClient.emailOtp.sendVerificationOtp({
        email: variables.email,
        type: 'email-verification',
      });
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
