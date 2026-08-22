import type { DropzoneOptions } from 'react-dropzone';

export type FieldType =
  | 'text'
  | 'password'
  | 'email'
  | 'number'
  | 'otp'
  | 'textarea'
  | 'select'
  | 'date'
  | 'date-picker'
  | 'file'
  | 'dropzone'
  | 'badge-group'
  | 'tag-input'
  | 'switch'
  | 'slider';

interface BaseFieldConfig {
  name: string; // matched with Zod Schema
  label: string;
  type: FieldType; // input type
  maxLength?: number;
  placeholder?: string;
  description?: string;
  colSpan?: number; // 1 or 2 (default)
  required?: boolean;
  disabled?: boolean;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

interface SelectFieldConfig {
  options?: { label: string; value: string }[];
}

interface DropzoneFieldConfig {
  accept?: DropzoneOptions['accept'];
  maxSize?: number;
  minSize?: number;
  maxFiles?: number;
}

interface SliderFieldConfig {
  min?: number;
  max?: number;
  step?: number;
  formatValue?: (value: number[]) => string;
}

interface TagInputFieldConfig {
  tags?: { id: string; label: string }[];
  allowCreate?: boolean;
}

interface OtpFieldConfig {
  otpLength?: number;
}

export type FormFieldConfig = BaseFieldConfig &
  SelectFieldConfig &
  DropzoneFieldConfig &
  SliderFieldConfig &
  TagInputFieldConfig &
  OtpFieldConfig;
