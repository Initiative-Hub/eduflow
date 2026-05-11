'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { DialogTemplate } from '@/components/custom/dialog';
import { FormTemplate } from '@/components/custom/form';
import { useTranslatedFields } from '@/hooks/use-translated-fields';
import {
  type ChangePasswordFormData,
  changePasswordDefaultValues,
  changePasswordFields,
  createChangePasswordSchema,
} from './profile.config';

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    data: ChangePasswordFormData,
    options: { onSuccess: () => void }
  ) => void;
}

export function ChangePasswordDialog({
  isOpen,
  onOpenChange,
  onSubmit,
}: ChangePasswordDialogProps) {
  const t = useTranslations('ProfilePage');

  const schema = createChangePasswordSchema({
    tooShort: t('validation.passwordTooShort'),
    invalid: t('validation.passwordInvalid'),
    confirmRequired: t('validation.confirmPasswordRequired'),
    mustMatch: t('validation.passwordsMustMatch'),
    sameAsCurrent: t('validation.passwordSameAsCurrent'),
  });

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(schema),
    defaultValues: changePasswordDefaultValues,
  });

  const translatedFields = useTranslatedFields(
    changePasswordFields,
    'ProfilePage'
  );

  const handleSubmit = (data: ChangePasswordFormData) => {
    onSubmit(data, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
    });
  };

  return (
    <DialogTemplate
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className="max-w-md overflow-hidden rounded-2xl p-0 shadow-2xl"
    >
      <div className="border-primary/10 border-b bg-primary/5 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <KeyRound className="size-8" />
        </div>
        <h2 className="font-bold text-foreground text-xl">
          {t('changePasswordDialog.title')}
        </h2>
        <p className="mt-2 px-4 text-muted-foreground text-sm">
          {t('changePasswordDialog.description')}
        </p>
      </div>

      <FormTemplate
        schema={schema}
        defaultValues={changePasswordDefaultValues}
        fields={translatedFields}
        onSubmit={handleSubmit}
        submitLabel={t('changePasswordDialog.submit')}
        form={form}
        className="gap-5 p-8"
      />
    </DialogTemplate>
  );
}
