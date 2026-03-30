import { BadgeGroupField } from './fields/badge-group-field';
import { DatePickerField } from './fields/date-picker-field';
import { DropzoneField } from './fields/dropzone-field';
import { InputField } from './fields/input-field';
import { SelectField } from './fields/select-field';
import { SliderField } from './fields/slider-field';
import { SwitchField } from './fields/switch-field';
import { TextareaField } from './fields/textarea-field';
import type { FormFieldConfig } from './form.types';

export const FieldRenderer = ({
  field,
  formField,
}: {
  field: FormFieldConfig;
  formField: any;
}) => {
  switch (field.type) {
    case 'select':
      return <SelectField field={field} formField={formField} />;
    case 'textarea':
      return <TextareaField field={field} formField={formField} />;
    case 'date-picker':
      return <DatePickerField field={field} formField={formField} />;
    case 'dropzone':
      return <DropzoneField field={field} formField={formField} />;
    case 'badge-group':
      return <BadgeGroupField field={field} formField={formField} />;
    case 'slider':
      return <SliderField field={field} formField={formField} />;
    case 'switch':
      return <SwitchField field={field} formField={formField} />;
    default:
      return <InputField field={field} formField={formField} />;
  }
};
