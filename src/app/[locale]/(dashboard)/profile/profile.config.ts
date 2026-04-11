import { z } from 'zod';
import type { FormFieldConfig } from '@/components/custom/form';

export const profileSchema = z.object({
  name: z
    .string()
    .min(1, 'validation.nameRequired')
    .min(2, 'validation.nameTooShort'),
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

export const profileDefaultValues = (name: string): ProfileFormData => ({
  name,
  bio: '',
});
