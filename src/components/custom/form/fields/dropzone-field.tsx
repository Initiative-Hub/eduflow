import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from '@/components/ui/dropzone';
import type { FormFieldConfig } from '../form.types';

interface DropzoneFieldProps {
  field: FormFieldConfig;
  formField: {
    value: File[] | undefined;
    onChange: (files: File[]) => void;
  };
}

export const DropzoneField = ({ field, formField }: DropzoneFieldProps) => {
  return (
    <Dropzone
      accept={field.accept}
      maxSize={field.maxSize}
      minSize={field.minSize}
      maxFiles={field.maxFiles}
      src={formField.value}
      onDrop={(acceptedFiles) => formField.onChange(acceptedFiles)}
    >
      <DropzoneContent />
      <DropzoneEmptyState />
    </Dropzone>
  );
};
