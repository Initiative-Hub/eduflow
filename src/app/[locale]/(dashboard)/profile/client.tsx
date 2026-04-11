'use client';

import { User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AvatarTemplate } from '@/components/custom/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AccountDetailsCard } from './account-details-card';
import {
  profileDefaultValues,
  profileSchema,
  type ProfileFormData,
} from './profile.config';
import { useProfile } from './use-profile';

interface ProfileClientProps {
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  createdAt: string;
  emailVerified: boolean;
}

export function ProfileClient({
  name,
  email,
  image,
  role,
  createdAt,
  emailVerified,
}: ProfileClientProps) {
  const t = useTranslations('ProfilePage');
  const { handleSubmit, isLoading } = useProfile();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileDefaultValues(name),
  });

  const isDirty = form.formState.isDirty;

  function handleDiscard() {
    form.reset(profileDefaultValues(name));
  }

  return (
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
          <p className="mt-1 text-muted-foreground text-sm">{t('subtitle')}</p>
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
                  avatarUrl={image ?? undefined}
                  fallback={name.slice(0, 2).toUpperCase()}
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
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
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
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {t('fields.email')}
                    </FieldLabel>
                    <Input
                      id="profile-email"
                      value={email}
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
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
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

        {/* Account details (read-only) */}
        <AccountDetailsCard
          role={role}
          createdAt={createdAt}
          emailVerified={emailVerified}
        />

        {/* Action bar */}
        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDiscard}
            disabled={!isDirty || isLoading}
            className="w-full cursor-pointer sm:w-auto font-semibold text-muted-foreground hover:text-foreground"
          >
            {t('actions.discard')}
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full cursor-pointer sm:w-auto bg-primary text-primary-foreground font-semibold px-6"
          >
            {isLoading ? t('actions.saving') : t('actions.save')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
