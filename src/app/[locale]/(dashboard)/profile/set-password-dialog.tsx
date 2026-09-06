'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { DialogTemplate } from '@/components/custom/dialog';
import { FormTemplate } from '@/components/custom/form';
import { useTranslatedFields } from '@/hooks/use-translated-fields';
import {
  createSetPasswordSchema,
  type SetPasswordFormData,
  setPasswordDefaultValues,
  setPasswordFields,
} from './profile.config';

interface SetPasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (password: string, options: { onSuccess: () => void }) => void;
}

export function SetPasswordDialog({
  isOpen,
  onOpenChange,
  onSubmit,
}: SetPasswordDialogProps) {
  const t = useTranslations('ProfilePage');

  const schema = createSetPasswordSchema({
    tooShort: t('validation.passwordTooShort'),
    invalid: t('validation.passwordInvalid'),
    confirmRequired: t('validation.confirmPasswordRequired'),
    mustMatch: t('validation.passwordsMustMatch'),
  });

  const form = useForm<SetPasswordFormData>({
    resolver: zodResolver(schema),
    defaultValues: setPasswordDefaultValues,
  });

  const translatedFields = useTranslatedFields(
    setPasswordFields,
    'ProfilePage'
  );

  const handleSubmit = (data: SetPasswordFormData) => {
    onSubmit(data.password, {
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
        schema={schema}
        defaultValues={setPasswordDefaultValues}
        fields={translatedFields}
        onSubmit={handleSubmit}
        submitLabel={t('setPasswordDialog.submit')}
        form={form}
        className="gap-5 p-8"
      />
    </DialogTemplate>
  );
}
