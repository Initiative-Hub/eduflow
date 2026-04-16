'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { DialogTemplate } from '@/components/custom/dialog';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AccountDetailsCard } from './account-details-card';
import { PersonalInfoCard } from './personal-info-card';
import {
  type ProfileFormData,
  profileDefaultValues,
  profileSchema,
  type SetPasswordFormData,
  setPasswordSchema,
} from './profile.config';
import type { UserBasicInfo, UserSecurityInfo } from './profile.service';
import { SecurityInfoCard } from './security-info-card';
import { useProfile } from './use-profile';

interface ProfileClientProps {
  initialBasicInfo: UserBasicInfo;
  initialSecurityInfo: UserSecurityInfo;
}

export function ProfileClient({
  initialBasicInfo,
  initialSecurityInfo,
}: ProfileClientProps) {
  const t = useTranslations('ProfilePage');
  const [isSetPasswordDialogOpen, setIsSetPasswordDialogOpen] = useState(false);

  const {
    basicInfo,
    securityInfo,
    isLoading,
    isSaving,
    isSettingPassword,
    handleSubmit,
    handleSetPassword,
  } = useProfile({ initialBasicInfo, initialSecurityInfo });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      bio: '',
    },
  });

  const passwordForm = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Update form when basicInfo is loaded
  useEffect(() => {
    if (basicInfo) {
      form.reset(profileDefaultValues(basicInfo.name));
    }
  }, [basicInfo, form]);

  const isDirty = form.formState.isDirty;
  const isActionDisabled = !isDirty || isSaving;

  function handleDiscard() {
    if (basicInfo) {
      form.reset(profileDefaultValues(basicInfo.name));
    }
  }

  const onPasswordSubmit = passwordForm.handleSubmit((data) => {
    handleSetPassword(data.password, {
      onSuccess: () => {
        setIsSetPasswordDialogOpen(false);
        passwordForm.reset();
      },
    });
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!basicInfo || !securityInfo) {
    return null;
  }

  return (
    <>
      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit((data) => handleSubmit(data))}
          className="flex flex-col gap-8"
        >
          {/* Page header */}
          <div className="fade-in animate-in duration-300">
            <h1 className="font-bold text-2xl text-foreground tracking-tight">
              {t('title')}
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              {t('subtitle')}
            </p>
          </div>

          <PersonalInfoCard
            name={basicInfo.name}
            email={basicInfo.email}
            image={basicInfo.image}
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

          {/* Action bar */}
          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDiscard}
              disabled={isActionDisabled}
              className="w-full cursor-pointer font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:bg-transparent disabled:text-muted-foreground/50 sm:w-auto"
            >
              {t('actions.discard')}
            </Button>
            <Button
              type="submit"
              disabled={isActionDisabled}
              className="w-full cursor-pointer bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60 sm:w-auto"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {isSaving ? t('actions.saving') : t('actions.save')}
            </Button>
          </div>
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

        <form onSubmit={onPasswordSubmit} className="space-y-5 p-8">
          <FieldGroup className="space-y-4">
            <Field
              data-invalid={
                !!passwordForm.formState.errors.password || undefined
              }
            >
              <FieldLabel
                htmlFor="dialog-password"
                className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest"
              >
                {t('setPasswordDialog.label')}
              </FieldLabel>
              <div className="relative mt-1">
                <Input
                  id="dialog-password"
                  type="password"
                  placeholder={t('setPasswordDialog.placeholder')}
                  {...passwordForm.register('password')}
                  className="h-11 rounded-xl border-muted-foreground/20 bg-background focus:border-primary focus:ring-primary/20"
                  aria-invalid={!!passwordForm.formState.errors.password}
                />
              </div>
              <FieldError errors={[passwordForm.formState.errors.password]} />
            </Field>

            <Field
              data-invalid={
                !!passwordForm.formState.errors.confirmPassword || undefined
              }
            >
              <FieldLabel
                htmlFor="dialog-confirm-password"
                className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest"
              >
                {t('setPasswordDialog.confirmLabel')}
              </FieldLabel>
              <div className="relative mt-1">
                <Input
                  id="dialog-confirm-password"
                  type="password"
                  placeholder={t('setPasswordDialog.confirmPlaceholder')}
                  {...passwordForm.register('confirmPassword')}
                  className="h-11 rounded-xl border-muted-foreground/20 bg-background focus:border-primary focus:ring-primary/20"
                  aria-invalid={!!passwordForm.formState.errors.confirmPassword}
                />
              </div>
              <FieldError
                errors={[passwordForm.formState.errors.confirmPassword]}
              />
            </Field>
          </FieldGroup>

          <Button
            type="submit"
            disabled={isSettingPassword}
            className="w-full rounded-xl bg-primary py-6 font-bold text-base text-white shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:shadow-xl active:scale-[0.98]"
          >
            {isSettingPassword ? (
              <Loader2 className="mr-2 size-5 animate-spin" />
            ) : null}
            {t('setPasswordDialog.submit')}
          </Button>
        </form>
      </DialogTemplate>
    </>
  );
}
