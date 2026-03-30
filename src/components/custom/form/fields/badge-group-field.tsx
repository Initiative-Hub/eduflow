import { Badge } from '@/components/ui/badge';
import type { FormFieldConfig } from '../form.types';

interface BadgeGroupFieldProps {
  field: FormFieldConfig;
  formField: {
    value: string[];
    onChange: (value: string[]) => void;
  };
}

export const BadgeGroupField = ({ field, formField }: BadgeGroupFieldProps) => {
  const handleToggle = (optionValue: string) => {
    const currentValues = formField.value || [];
    if (currentValues.includes(optionValue)) {
      formField.onChange(currentValues.filter((v) => v !== optionValue));
    } else {
      formField.onChange([...currentValues, optionValue]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {field.options?.map((option) => {
        const isSelected = (formField.value || []).includes(option.value);
        return (
          <Badge
            key={option.value}
            onClick={() => handleToggle(option.value)}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 transition-all ${
              isSelected
                ? 'border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
            }`}
          >
            {option.label}
          </Badge>
        );
      })}
    </div>
  );
};
