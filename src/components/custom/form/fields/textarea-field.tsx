import { Textarea } from '@/components/ui/textarea';
import type { FormFieldConfig } from '../form.types';

export const TextareaField = ({
  field,
  formField,
}: {
  field: FormFieldConfig;
  formField: any;
}) => (
  <Textarea
    id={field.name}
    placeholder={field.placeholder}
    maxLength={field.maxLength}
    className="resize-none text-sm"
    {...formField}
  />
);
