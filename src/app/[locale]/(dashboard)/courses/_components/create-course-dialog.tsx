import { DialogTemplate } from '@/components/custom/dialog/dialog';
import { FormTemplate } from '@/components/custom/form';
import {
  createCourseDefaultValues,
  createCourseFields,
  createCourseSchema,
  type CreateCourseFormData,
} from './create-course.config';

interface CreateCourseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCourseFormData) => void;
  isLoading: boolean;
}

export function CreateCourseDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateCourseDialogProps) {
  return (
    <DialogTemplate
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Create New Course"
      description="Enter the basics for your new course to get started."
    >
      <FormTemplate
        schema={createCourseSchema}
        defaultValues={createCourseDefaultValues}
        fields={createCourseFields}
        onSubmit={onSubmit}
        submitLabel="Create Course"
        isLoading={isLoading}
      />
    </DialogTemplate>
  );
}
