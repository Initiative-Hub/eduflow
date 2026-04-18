'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { AvatarChangePayload } from '@/components/custom/avatar';
import type { ProfileFormData } from './profile.config';
import { profileService } from './profile.service';

const USER_BASIC_INFO_QUERY_KEY = ['user-basic-info'] as const;
const USER_SECURITY_INFO_QUERY_KEY = ['user-security-info'] as const;

export function useProfile() {
  const t = useTranslations('ProfilePage');
  const queryClient = useQueryClient();

  const basicInfoQuery = useQuery({
    queryKey: USER_BASIC_INFO_QUERY_KEY,
    queryFn: profileService.getBasicInfo,
  });

  const securityInfoQuery = useQuery({
    queryKey: USER_SECURITY_INFO_QUERY_KEY,
    queryFn: profileService.getSecurityInfo,
  });

  const updateMutation = useMutation<void, Error, ProfileFormData>({
    mutationFn: async (data: ProfileFormData) => {
      await profileService.update(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_BASIC_INFO_QUERY_KEY });
      toast.success(t('toast.saved'), {
        description: t('toast.savedDesc'),
      });
    },
  });

  const avatarMutation = useMutation<void, Error, AvatarChangePayload>({
    mutationFn: async (payload) => {
      if (payload.mode === 'remove') {
        await profileService.removeAvatar();
        return;
      }

      if (!payload.file) {
        throw new Error(t('avatar.saveError'));
      }

      await profileService.uploadAvatar(payload.file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_BASIC_INFO_QUERY_KEY });
    },
  });

  const setPasswordMutation = useMutation<void, Error, string>({
    mutationFn: async (password: string) => {
      await profileService.setPassword(password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_SECURITY_INFO_QUERY_KEY });
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
    isAvatarSaving: avatarMutation.isPending,
    isSettingPassword: setPasswordMutation.isPending,
    handleSubmit: updateMutation.mutate,
    handleAvatarChange: avatarMutation.mutateAsync,
    handleSetPassword: setPasswordMutation.mutate,
  };
}
