'use client';

import { User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { AvatarTemplate } from '@/components/custom/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ProfileFormData } from './profile.config';

interface PersonalInfoCardProps {
  name: string;
  email: string;
  image: string | null;
}

export function PersonalInfoCard({ name, email, image }: PersonalInfoCardProps) {
  const t = useTranslations('ProfilePage');
  const form = useFormContext<ProfileFormData>();

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="size-4 text-primary" />
          {t('sections.personalInfo')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
          <div className="shrink-0 self-center sm:self-start">
            <AvatarTemplate
              avatarUrl={image ?? undefined}
              fallback={name.slice(0, 2).toUpperCase()}
            />
          </div>

          <FieldGroup className="flex-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field data-invalid={!!form.formState.errors.name || undefined}>
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
                  value={email}
                  readOnly
                  disabled
                  className="h-10 cursor-not-allowed opacity-70"
                />
              </Field>
            </div>

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
  );
}
