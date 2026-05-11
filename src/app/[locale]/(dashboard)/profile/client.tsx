'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { AccountDetailsCard } from './account-details-card';
import {
  AIPreferencesCard,
  type AIPreferencesData,
} from './ai-preferences-card';
import { ChangePasswordDialog } from './change-password-dialog';
import { PersonalInfoCard } from './personal-info-card';
import {
  DEFAULT_AI_PREFERENCES,
  type ProfileFormData,
  profileSchema,
} from './profile.config';
import { SecurityInfoCard } from './security-info-card';
import { SetPasswordDialog } from './set-password-dialog';
import { useProfile } from './use-profile';

export default function ProfileClient() {
  const t = useTranslations('ProfilePage');
  const [isSetPasswordDialogOpen, setIsSetPasswordDialogOpen] = useState(false);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] =
    useState(false);

  // Default AI preferences - will be replaced with actual data from service later
  const [aiPreferences, setAiPreferences] = useState<AIPreferencesData>(
    DEFAULT_AI_PREFERENCES
  );

  const handleAiPreferencesChange = (newPreferences: AIPreferencesData) => {
    setAiPreferences(newPreferences);
    // TODO: Call service to save preferences
  };

  const {
    basicInfo,
    securityInfo,
    isLoading,
    isSaving,
    isSettingPassword,
    isChangingPassword,
    handleSubmit,
    handleAvatarChange,
    handleSetPassword,
    handleChangePassword,
    isEditing,
    setIsEditing,
  } = useProfile();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      bio: '',
    },
  });

  const {
    reset: resetForm,
    formState: { isDirty },
  } = form;

  useEffect(() => {
    if (!basicInfo) return;
    resetForm({
      name: basicInfo.name,
      email: basicInfo.email,
      bio: basicInfo.bio ?? '',
    });
  }, [basicInfo, resetForm]);

  const handleDiscard = () => {
    if (!basicInfo) return;
    form.reset({
      name: basicInfo.name,
      email: basicInfo.email,
      bio: basicInfo.bio ?? '',
    });
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!basicInfo || !securityInfo) return null;

  return (
    <>
      <div className="fade-in animate-in duration-300">
        <h1 className="font-bold text-2xl text-foreground tracking-tight">
          {t('title')}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">{t('subtitle')}</p>
      </div>

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit((data) => {
            if (!isDirty) {
              setIsEditing(false);
              return;
            }
            handleSubmit(data);
          })}
          className="flex flex-col gap-8"
        >
          <PersonalInfoCard
            name={basicInfo.name}
            image={basicInfo.image}
            onAvatarChange={handleAvatarChange}
            isEditing={isEditing}
            onEditToggle={() => setIsEditing(true)}
          />

          <AccountDetailsCard
            role={basicInfo.role}
            createdAt={new Date(basicInfo.createdAt).toISOString()}
            emailVerified={basicInfo.emailVerified}
          />

          <SecurityInfoCard
            provider={securityInfo.provider}
            hasPassword={securityInfo.hasPassword}
            userAgent={securityInfo.userAgent}
            onSetPassword={() => setIsSetPasswordDialogOpen(true)}
            onChangePassword={() => setIsChangePasswordDialogOpen(true)}
            isResetting={isSettingPassword}
            isChanging={isChangingPassword}
          />

          <AIPreferencesCard
            preferences={aiPreferences}
            onChange={handleAiPreferencesChange}
            isSaving={false}
          />

          {isEditing && (
            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="ghost"
                onClick={handleDiscard}
                disabled={isSaving}
                className="w-full cursor-pointer font-semibold text-muted-foreground hover:bg-muted hover:text-foreground sm:w-auto"
              >
                {t('actions.discard')}
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="w-full cursor-pointer bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto"
              >
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                {isSaving ? t('actions.saving') : t('actions.save')}
              </Button>
            </div>
          )}
        </form>
      </FormProvider>

      <SetPasswordDialog
        isOpen={isSetPasswordDialogOpen}
        onOpenChange={setIsSetPasswordDialogOpen}
        onSubmit={handleSetPassword}
      />

      <ChangePasswordDialog
        isOpen={isChangePasswordDialogOpen}
        onOpenChange={setIsChangePasswordDialogOpen}
        onSubmit={handleChangePassword}
      />
    </>
  );
}
