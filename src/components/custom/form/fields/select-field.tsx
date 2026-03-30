import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FormFieldConfig } from '../form.types';

export const SelectField = ({
  field,
  formField,
}: {
  field: FormFieldConfig;
  formField: any;
}) => (
  <Select onValueChange={formField.onChange} defaultValue={formField.value}>
    <SelectTrigger className="w-full">
      <SelectValue placeholder={field.placeholder} />
    </SelectTrigger>
    <SelectContent>
      {field.options?.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
