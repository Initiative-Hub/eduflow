import { z } from 'zod';
import type { FormFieldConfig } from '@/components/custom/form';

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const resetPasswordFields: FormFieldConfig[] = [
  {
    name: 'password',
    label: 'form.password.label',
    type: 'password',
    placeholder: 'form.password.placeholder',
    required: true,
    colSpan: 2,
  },
  {
    name: 'confirmPassword',
    label: 'form.confirmPassword.label',
    type: 'password',
    placeholder: 'form.confirmPassword.placeholder',
    required: true,
    colSpan: 2,
  },
];

export const resetPasswordDefaultValues: ResetPasswordFormData = {
  password: '',
  confirmPassword: '',
};
