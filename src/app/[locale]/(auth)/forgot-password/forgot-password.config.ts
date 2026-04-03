import { z } from 'zod';
import type { FormFieldConfig } from '@/components/custom/form';

export const forgotPasswordSchema = z.object({
  email: z.email('Please enter valid email'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const forgotPasswordFields: FormFieldConfig[] = [
  {
    name: 'email',
    label: 'form.email.label',
    type: 'email', // translation keys
    placeholder: 'form.email.placeholder', // translation keys
    required: true,
    colSpan: 2,
  },
];

export const forgotPasswordDefaultValues: ForgotPasswordFormData = {
  email: '',
};
