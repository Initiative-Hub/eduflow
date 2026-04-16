'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { ProfileFormData } from './profile.config';
import {
  profileService,
  type UserBasicInfo,
  type UserSecurityInfo,
} from './profile.service';

interface UseProfileOptions {
  initialBasicInfo: UserBasicInfo;
  initialSecurityInfo: UserSecurityInfo;
}

export function useProfile({
  initialBasicInfo,
  initialSecurityInfo,
}: UseProfileOptions) {
  const t = useTranslations('ProfilePage');
  const queryClient = useQueryClient();

  const basicInfoQuery = useQuery({
    queryKey: ['user-basic-info'],
    queryFn: profileService.getBasicInfo,
    initialData: initialBasicInfo,
  });

  const securityInfoQuery = useQuery({
    queryKey: ['user-security-info'],
    queryFn: profileService.getSecurityInfo,
    initialData: initialSecurityInfo,
  });

  const updateMutation = useMutation<void, Error, ProfileFormData>({
    mutationFn: async (data: ProfileFormData) => {
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
