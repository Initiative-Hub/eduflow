'use client';

import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api';
import { sanitizeUrl } from '@/utils/url-helper';
import { roleService } from './role.service';

export function useRole() {
  const [isSuccess, setIsSuccess] = useState(false);
  const searchParams = useSearchParams();

  const roleMutation = useMutation<void, ApiError, 'STUDENT' | 'TEACHER'>({
    mutationFn: async (role: 'STUDENT' | 'TEACHER') => {
      await roleService.updateRole(role);
    },
    onSuccess: () => {
      setIsSuccess(true);
      const nextUrl = sanitizeUrl(searchParams.get('nextUrl')) || '/';

      // Delay redirection to allow the "All Set" screen to show
      setTimeout(() => {
        window.location.assign(nextUrl);
      }, 2500);
    },
    onError: (error) => {
      console.error('Role Selection Error:', error);
      toast.error(error.message || 'Failed to update role');
    },
  });

  return {
    handleRoleSelect: roleMutation.mutate,
    isSelecting: roleMutation.isPending,
    isSuccess,
    selectingRole: roleMutation.variables,
  };
}
