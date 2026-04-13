'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { ProfileFormData } from './profile.config';
import { profileService } from './profile.service';

export function useProfile() {
  const t = useTranslations('ProfilePage');

  const mutation = useMutation<void, Error, ProfileFormData>({
    mutationFn: async (data: ProfileFormData) => {
      await profileService.update(data);
    },
    onSuccess: () => {
      toast.success(t('toast.saved'), {
        description: t('toast.savedDesc'),
      });
    },
  });

  return {
    handleSubmit: mutation.mutate,
    isLoading: mutation.isPending,
  };
}
