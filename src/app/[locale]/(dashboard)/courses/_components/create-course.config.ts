import { z } from 'zod';
import type { FormFieldConfig } from '@/components/custom/form';

export const createCourseSchema = z.object({
  title: z.string().min(1, 'Course Title is required'),
  description: z.string().optional(),
});

export type CreateCourseFormData = z.infer<typeof createCourseSchema>;

export const createCourseDefaultValues: CreateCourseFormData = {
  title: '',
  description: '',
};

export const createCourseFields: FormFieldConfig[] = [
  {
    name: 'title',
    label: 'Course Title',
    type: 'text',
    placeholder: 'Enter course title',
    required: true,
    colSpan: 2,
  },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    placeholder: 'Describe your course (optional)',
    required: false,
    colSpan: 2,
  },
];
