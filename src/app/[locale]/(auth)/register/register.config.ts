import { z } from 'zod';
import type { FormFieldConfig } from '@/components/custom/form';

export const registerSchema = z
  .object({
    fullname: z.string().min(1, 'Full Name cannot be empty'),
    email: z.email('Please enter a valid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const registerFields: FormFieldConfig[] = [
  {
    name: 'fullname',
    label: 'form.fullname.label',
    type: 'text',
    placeholder: 'form.fullname.placeholder',
    required: true,
    colSpan: 2,
  },
  {
    name: 'email',
    label: 'form.email.label',
    type: 'email',
    placeholder: 'form.email.placeholder',
    required: true,
    colSpan: 2,
  },
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

export const registerDefaultValues: RegisterFormData = {
  fullname: '',
  email: '',
  password: '',
  confirmPassword: '',
};
