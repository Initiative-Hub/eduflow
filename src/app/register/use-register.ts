'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ApiError } from '@/lib/api';
import type { RegisterFormData } from './register.config';
import { registerService } from './register.service';

export function useRegister() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: RegisterFormData) => {
    setError('');
    setIsLoading(true);

    try {
      await registerService.register({
        email: data.email,
        password: data.password,
      });

      router.replace('/login');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return { error, isLoading, handleSubmit };
}
