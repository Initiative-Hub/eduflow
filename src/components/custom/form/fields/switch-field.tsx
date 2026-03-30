import { Switch } from '@/components/ui/switch';
import type { FormFieldConfig } from '../form.types';

interface SwitchFieldProps {
  field: FormFieldConfig;
  formField: {
    value: boolean;
    onChange: (value: boolean) => void;
  };
}

export const SwitchField = ({ field, formField }: SwitchFieldProps) => {
  return (
    <div className="flex flex-row items-center justify-between rounded-lg p-0">
      <div className="space-y-0.5">
        <label
          htmlFor={field.name}
          className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {field.label}
          {field.required && <span className="text-red-500">*</span>}
        </label>
        {field.description && (
          <p className="text-[0.8rem] text-muted-foreground">
            {field.description}
          </p>
        )}
      </div>
      <Switch
        id={field.name}
        checked={formField.value || false}
        onCheckedChange={(checked) => formField.onChange(checked as boolean)}
      />
    </div>
  );
};
