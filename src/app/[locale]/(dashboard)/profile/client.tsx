'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Shield, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { AvatarTemplate } from '@/components/custom/avatar';
import { DialogTemplate } from '@/components/custom/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AccountDetailsCard } from './account-details-card';
import {
  type ProfileFormData,
  type SetPasswordFormData,
  profileDefaultValues,
  profileSchema,
  setPasswordSchema,
} from './profile.config';
import { SecurityInfoCard } from './security-info-card';
import { useProfile } from './use-profile';

export function ProfileClient() {
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
  } = useProfile();

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

          {/* Personal information card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="size-4 text-primary" />
                {t('sections.personalInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Avatar on left, fields on right */}
              <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
                {/* Avatar */}
                <div className="shrink-0 self-center sm:self-start">
                  <AvatarTemplate
                    avatarUrl={basicInfo.image ?? undefined}
                    fallback={basicInfo.name.slice(0, 2).toUpperCase()}
                  />
                </div>

                {/* Fields */}
                <FieldGroup className="flex-1">
                  {/* Name & Email */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                      data-invalid={!!form.formState.errors.name || undefined}
                    >
                      <FieldLabel
                        htmlFor="profile-name"
                        className="font-semibold text-muted-foreground text-xs uppercase tracking-wider"
                      >
                        {t('form.name.label')}
                      </FieldLabel>
                      <Input
                        id="profile-name"
                        placeholder={t('form.name.placeholder')}
                        {...form.register('name')}
                        className="h-10"
                        aria-invalid={!!form.formState.errors.name}
                      />
                      <FieldError errors={[form.formState.errors.name]} />
                    </Field>

                    <Field>
                      <FieldLabel
                        htmlFor="profile-email"
                        className="font-semibold text-muted-foreground text-xs uppercase tracking-wider"
                      >
                        {t('fields.email')}
                      </FieldLabel>
                      <Input
                        id="profile-email"
                        value={basicInfo.email}
                        readOnly
                        disabled
                        className="h-10 cursor-not-allowed opacity-70"
                      />
                    </Field>
                  </div>

                  {/* Bio */}
                  <Field>
                    <FieldLabel
                      htmlFor="profile-bio"
                      className="font-semibold text-muted-foreground text-xs uppercase tracking-wider"
                    >
                      {t('form.bio.label')}
                    </FieldLabel>
                    <Textarea
                      id="profile-bio"
                      placeholder={t('form.bio.placeholder')}
                      {...form.register('bio')}
                      rows={4}
                      className="resize-none"
                    />
                    <FieldError errors={[form.formState.errors.bio]} />
                  </Field>
                </FieldGroup>
              </div>
            </CardContent>
          </Card>

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
              disabled={!isDirty || isSaving}
              className="w-full cursor-pointer font-semibold text-muted-foreground hover:text-foreground sm:w-auto"
            >
              {t('actions.discard')}
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="w-full cursor-pointer bg-primary px-6 font-semibold text-primary-foreground sm:w-auto"
            >
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
        className="max-w-md rounded-2xl border-none bg-white p-0 shadow-2xl overflow-hidden"
      >
        <div className="bg-primary/5 p-8 text-center border-b border-primary/10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Shield className="size-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {t('setPasswordDialog.title')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground px-4">
            {t('setPasswordDialog.description')}
          </p>
        </div>

        <form onSubmit={onPasswordSubmit} className="space-y-5 p-8">
          <FieldGroup className="space-y-4">
            <Field data-invalid={!!passwordForm.formState.errors.password || undefined}>
              <FieldLabel
                htmlFor="dialog-password"
                className="font-bold text-muted-foreground text-[10px] uppercase tracking-widest"
              >
                {t('setPasswordDialog.label')}
              </FieldLabel>
              <div className="relative mt-1">
                <Input
                  id="dialog-password"
                  type="password"
                  placeholder={t('setPasswordDialog.placeholder')}
                  {...passwordForm.register('password')}
                  className="h-11 rounded-xl bg-background border-muted-foreground/20 focus:border-primary focus:ring-primary/20"
                  aria-invalid={!!passwordForm.formState.errors.password}
                />
              </div>
              <FieldError errors={[passwordForm.formState.errors.password]} />
            </Field>

            <Field data-invalid={!!passwordForm.formState.errors.confirmPassword || undefined}>
              <FieldLabel
                htmlFor="dialog-confirm-password"
                className="font-bold text-muted-foreground text-[10px] uppercase tracking-widest"
              >
                {t('setPasswordDialog.confirmLabel')}
              </FieldLabel>
              <div className="relative mt-1">
                <Input
                  id="dialog-confirm-password"
                  type="password"
                  placeholder={t('setPasswordDialog.confirmPlaceholder')}
                  {...passwordForm.register('confirmPassword')}
                  className="h-11 rounded-xl bg-background border-muted-foreground/20 focus:border-primary focus:ring-primary/20"
                  aria-invalid={!!passwordForm.formState.errors.confirmPassword}
                />
              </div>
              <FieldError errors={[passwordForm.formState.errors.confirmPassword]} />
            </Field>
          </FieldGroup>

          <Button
            type="submit"
            disabled={isSettingPassword}
            className="w-full bg-primary py-6 font-bold text-base shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98] rounded-xl text-white"
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
