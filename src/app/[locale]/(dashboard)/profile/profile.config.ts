import type { LucideIcon } from 'lucide-react';
import { z } from 'zod';
import type { FormFieldConfig } from '@/components/custom/form';
import { passwordRegex } from '@/lib/validations/common.schema';

export type InteractionStyle = 'friendly' | 'professional' | 'technical';
export type ResponseTone = 'encouraging' | 'balanced' | 'direct';
export type AILanguage = 'en' | 'vi';

export interface AIPreferencesData {
  interactionStyle: InteractionStyle;
  responseTone: ResponseTone;
  primaryLanguage: AILanguage;
  quizScoreAlerts: boolean;
  insightFeedback: boolean;
}

export interface InteractionStyleOption {
  value: InteractionStyle;
  icon: LucideIcon;
  labelKey: string;
}

export const RESPONSE_TONE_STEPS: ResponseTone[] = [
  'encouraging',
  'balanced',
  'direct',
];

export const DEFAULT_AI_PREFERENCES: AIPreferencesData = {
  interactionStyle: 'friendly',
  responseTone: 'balanced',
  primaryLanguage: 'en',
  quizScoreAlerts: true,
  insightFeedback: false,
};

export const profileSchema = z.object({
  name: z
    .string()
    .min(1, 'Full name is required.')
    .min(2, 'Name must be at least 2 characters.'),
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

export type SetPasswordFormData = {
  password: string;
  confirmPassword: string;
};

export type ChangePasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

export const setPasswordDefaultValues: SetPasswordFormData = {
  password: '',
  confirmPassword: '',
};

export const changePasswordDefaultValues: ChangePasswordFormData = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
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

export interface PasswordMessages {
  tooShort: string;
  invalid: string;
  confirmRequired: string;
  mustMatch: string;
}

export interface ChangePasswordMessages extends PasswordMessages {
  sameAsCurrent: string;
}

export function createSetPasswordSchema(msgs: PasswordMessages) {
  const pw = z
    .string()
    .min(8, msgs.tooShort)
    .regex(passwordRegex, msgs.invalid);

  return z
    .object({
      password: pw,
      confirmPassword: z.string().min(1, msgs.confirmRequired),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: msgs.mustMatch,
      path: ['confirmPassword'],
    });
}

export function createChangePasswordSchema(msgs: ChangePasswordMessages) {
  const pw = z
    .string()
    .min(8, msgs.tooShort)
    .regex(passwordRegex, msgs.invalid);

  return z
    .object({
      currentPassword: z.string().min(1, msgs.confirmRequired),

      newPassword: pw,
      confirmNewPassword: z.string().min(1, msgs.confirmRequired),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: msgs.mustMatch,
      path: ['confirmNewPassword'],
    })
    .refine((data) => data.newPassword !== data.currentPassword, {
      message: msgs.sameAsCurrent,
      path: ['newPassword'],
    });
}
