'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { DialogTemplate } from '@/components/custom/dialog';
import { FormTemplate } from '@/components/custom/form';
import { Button } from '@/components/ui/button';
import { useTranslatedFields } from '@/hooks/use-translated-fields';
import { AccountDetailsCard } from './account-details-card';
import { PersonalInfoCard } from './personal-info-card';
import {
  type ProfileFormData,
  profileSchema,
  type SetPasswordFormData,
  setPasswordDefaultValues,
  setPasswordFields,
  setPasswordSchema,
} from './profile.config';
import { SecurityInfoCard } from './security-info-card';
import { useProfile } from './use-profile';

export default function ProfileClient() {
  const t = useTranslations('ProfilePage');
  const translatedPasswordFields = useTranslatedFields(
    setPasswordFields,
    'ProfilePage'
  );
  const [isSetPasswordDialogOpen, setIsSetPasswordDialogOpen] = useState(false);

  const {
    basicInfo,
    securityInfo,
    isLoading,
    isSaving,
    isAvatarSaving,
    isSettingPassword,
    handleSubmit,
    handleAvatarChange,
    handleSetPassword,
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

  const passwordForm = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: setPasswordDefaultValues,
  });

  // Update form when basicInfo is loaded
  useEffect(() => {
    if (!basicInfo) return;
    form.reset({
      name: basicInfo.name,
      email: basicInfo.email,
      bio: basicInfo.bio ?? '',
    });
  }, [basicInfo, form]);

  const handleDiscard = () => {
    if (!basicInfo) return;
    form.reset({
      name: basicInfo.name,
      email: basicInfo.email,
      bio: basicInfo.bio ?? '',
    });
    setIsEditing(false);
  };

  const handlePasswordSubmit = (data: SetPasswordFormData) => {
    handleSetPassword(data.password, {
      onSuccess: () => {
        setIsSetPasswordDialogOpen(false);
        passwordForm.reset();
      },
    });
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
      {/* Page header */}
      <div className="fade-in animate-in duration-300">
        <h1 className="font-bold text-2xl text-foreground tracking-tight">
          {t('title')}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">{t('subtitle')}</p>
      </div>

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit((data) => {
            if (!form.formState.isDirty) {
              setIsEditing(false); // no changes in form
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

          {/* Account details */}
          <AccountDetailsCard
            role={basicInfo.role}
            createdAt={new Date(basicInfo.createdAt).toISOString()}
            emailVerified={basicInfo.emailVerified}
          />

          {/* Security info */}
          <SecurityInfoCard
            provider={securityInfo.provider}
            hasPassword={securityInfo.hasPassword}
            userAgent={securityInfo.userAgent}
            onSetPassword={() => setIsSetPasswordDialogOpen(true)}
            isResetting={isSettingPassword}
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

      {/* Set Password Dialog */}
      <DialogTemplate
        isOpen={isSetPasswordDialogOpen}
        onOpenChange={setIsSetPasswordDialogOpen}
        hideHeader
        className="max-w-md overflow-hidden rounded-2xl border-none bg-white p-0 shadow-2xl"
      >
        <div className="border-primary/10 border-b bg-primary/5 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Shield className="size-8" />
          </div>
          <h2 className="font-bold text-foreground text-xl">
            {t('setPasswordDialog.title')}
          </h2>
          <p className="mt-2 px-4 text-muted-foreground text-sm">
            {t('setPasswordDialog.description')}
          </p>
        </div>

        <FormTemplate
          schema={setPasswordSchema}
          defaultValues={setPasswordDefaultValues}
          fields={translatedPasswordFields}
          onSubmit={handlePasswordSubmit}
          submitLabel={t('setPasswordDialog.submit')}
          form={passwordForm}
          className="gap-5 p-8"
        />
      </DialogTemplate>
    </>
  );
}
