import { z } from 'zod';
import type { FormFieldConfig } from '@/components/custom/form';

export const createLessonSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

export type CreateLessonFormData = z.infer<typeof createLessonSchema>;

export const createLessonDefaultValues: CreateLessonFormData = {
  title: '',
};

export const lessonFields: FormFieldConfig[] = [
  {
    name: 'title',
    label: 'Lesson Title',
    type: 'text',
    placeholder: 'E.g., Introduction to the topic',
    required: true,
    colSpan: 2,
  },
];
