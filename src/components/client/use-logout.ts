'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { ApiError } from '@/lib/api';
import { logoutService } from './logout.service';

export function useLogout() {
  const router = useRouter();

  const mutation = useMutation<void, ApiError, void>({
    mutationFn: async () => {
      await logoutService.logout();
    },
    onSuccess: () => {
      router.push('/login');
    },
  });

  return {
    handleLogout: () => mutation.mutate(),
    isLoggingOut: mutation.isPending,
  };
}
