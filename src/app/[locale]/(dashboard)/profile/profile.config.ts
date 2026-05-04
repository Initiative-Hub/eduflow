import { z } from 'zod';
import type { FormFieldConfig } from '@/components/custom/form';

export const profileSchema = z.object({
  name: z
    .string()
    .min(1, 'validation.nameRequired')
    .min(2, 'validation.nameTooShort'),
  email: z.string(),
  bio: z.string().optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export const profileFields: FormFieldConfig[] = [
  {
    name: 'name',
    label: 'form.name.label',
    type: 'text',
    placeholder: 'form.name.placeholder',
    required: true,
    colSpan: 1,
  },
  {
    name: 'bio',
    label: 'form.bio.label',
    type: 'textarea',
    placeholder: 'form.bio.placeholder',
    colSpan: 2,
  },
];

export const setPasswordSchema = z
  .object({
    password: z.string().min(8, 'validation.passwordTooShort'),
    confirmPassword: z.string().min(1, 'validation.confirmPasswordRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation.passwordsMustMatch',
    path: ['confirmPassword'],
  });

export type SetPasswordFormData = z.infer<typeof setPasswordSchema>;

export const setPasswordDefaultValues: SetPasswordFormData = {
  password: '',
  confirmPassword: '',
};

export const setPasswordFields: FormFieldConfig[] = [
  {
    name: 'password',
    label: 'setPasswordDialog.label',
    type: 'password',
    placeholder: 'setPasswordDialog.placeholder',
    required: true,
    colSpan: 2,
  },
  {
    name: 'confirmPassword',
    label: 'setPasswordDialog.confirmLabel',
    type: 'password',
    placeholder: 'setPasswordDialog.confirmPlaceholder',
    required: true,
    colSpan: 2,
  },
];

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'validation.currentPasswordRequired'),
    newPassword: z.string().min(8, 'validation.passwordTooShort'),
    confirmNewPassword: z.string().min(1, 'validation.confirmPasswordRequired'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'validation.passwordsMustMatch',
    path: ['confirmNewPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export const changePasswordDefaultValues: ChangePasswordFormData = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
};

export const changePasswordFields: FormFieldConfig[] = [
  {
    name: 'currentPassword',
    label: 'changePasswordDialog.currentLabel',
    type: 'password',
    placeholder: 'changePasswordDialog.currentPlaceholder',
    required: true,
    colSpan: 2,
  },
  {
    name: 'newPassword',
    label: 'changePasswordDialog.newLabel',
    type: 'password',
    placeholder: 'changePasswordDialog.newPlaceholder',
    required: true,
    colSpan: 2,
  },
  {
    name: 'confirmNewPassword',
    label: 'changePasswordDialog.confirmLabel',
    type: 'password',
    placeholder: 'changePasswordDialog.confirmPlaceholder',
    required: true,
    colSpan: 2,
  },
];
