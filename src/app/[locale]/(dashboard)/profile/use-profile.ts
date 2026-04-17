'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { ProfileFormData } from './profile.config';
import { profileService } from './profile.service';

export function useProfile() {
  const t = useTranslations('ProfilePage');
  const queryClient = useQueryClient();

  const basicInfoQuery = useQuery({
    queryKey: ['user-basic-info'],
    queryFn: profileService.getBasicInfo,
  });

  const securityInfoQuery = useQuery({
    queryKey: ['user-security-info'],
    queryFn: profileService.getSecurityInfo,
  });

  const updateMutation = useMutation<void, Error, ProfileFormData>({
    mutationFn: async (data: ProfileFormData) => {
      console.log('Updating profile with data:', data);
      await profileService.update(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-basic-info'] });
      toast.success(t('toast.saved'), {
        description: t('toast.savedDesc'),
      });
    },
  });

  const setPasswordMutation = useMutation<void, Error, string>({
    mutationFn: async (password: string) => {
      await profileService.setPassword(password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-security-info'] });
      toast.success(t('toast.passwordSet'), {
        description: t('toast.passwordSetDesc'),
      });
    },
  });

  return {
    basicInfo: basicInfoQuery.data,
    securityInfo: securityInfoQuery.data,
    isLoading: basicInfoQuery.isLoading || securityInfoQuery.isLoading,
    isSaving: updateMutation.isPending,
    isSettingPassword: setPasswordMutation.isPending,
    handleSubmit: updateMutation.mutate,
    handleSetPassword: setPasswordMutation.mutate,
  };
}
