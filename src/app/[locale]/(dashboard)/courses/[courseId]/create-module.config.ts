import { z } from 'zod';
import type { FormFieldConfig } from '@/components/custom/form';

export const createModuleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

export type CreateModuleFormData = z.infer<typeof createModuleSchema>;

export const createModuleDefaultValues: CreateModuleFormData = {
  title: '',
};

export const moduleFields: FormFieldConfig[] = [
  {
    name: 'title',
    label: 'Module Title',
    type: 'text',
    placeholder: 'E.g., Getting Started',
    required: true,
    colSpan: 2,
  },
];
