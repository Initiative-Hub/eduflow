import { Slider } from '@/components/ui/slider';
import type { FormFieldConfig } from '../form.types';

interface SliderFieldProps {
  field: FormFieldConfig;
  formField: {
    value: number[];
    onChange: (value: number[]) => void;
  };
}

export const SliderField = ({ field, formField }: SliderFieldProps) => {
  const defaultFormatValue = (value: number[]) => `$${value[0]} - $${value[1]}`;
  const formatValue = field.formatValue || defaultFormatValue;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {formatValue(formField.value ?? [0, 0])}
        </span>
      </div>
      <Slider
        value={formField.value ?? [0, field.max ?? 100]}
        min={field.min ?? 0}
        max={field.max ?? 100}
        step={field.step ?? 1}
        minStepsBetweenThumbs={1}
        onValueChange={formField.onChange}
        className="py-4"
      />
    </div>
  );
};
