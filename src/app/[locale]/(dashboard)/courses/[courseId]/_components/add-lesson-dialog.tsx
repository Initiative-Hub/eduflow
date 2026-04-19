import { DialogTemplate } from '@/components/custom/dialog/dialog';
import { FormTemplate } from '@/components/custom/form';
import {
  createLessonSchema,
  createLessonDefaultValues,
  lessonFields,
  type CreateLessonFormData,
} from '../create-lesson.config';

interface AddLessonDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateLessonFormData) => void;
  isLoading: boolean;
}

/**
 * Modal dialog for creating a new lesson inside a module.
 * Extracted from the course modules page to keep that file under 100 lines.
 */
export function AddLessonDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  isLoading,
}: AddLessonDialogProps) {
  return (
    <DialogTemplate
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Add Lesson"
      description="Provide a title for the new lesson within this module."
    >
      <FormTemplate
        schema={createLessonSchema}
        defaultValues={createLessonDefaultValues}
        fields={lessonFields}
        onSubmit={onSubmit}
        submitLabel="Create Lesson"
        isLoading={isLoading}
      />
    </DialogTemplate>
  );
}
