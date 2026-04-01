import { z } from 'zod';
import type { FormFieldConfig } from '@/components/custom/form';

export const loginSchema = z.object({
  email: z.email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password cannot be empty.'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const loginFields: FormFieldConfig[] = [
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'Enter your email',
    required: true,
    colSpan: 2,
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    required: true,
    colSpan: 2,
  },
];

export const loginDefaultValues: LoginFormData = {
  email: '',
  password: '',
};
