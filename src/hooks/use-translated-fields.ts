import { useTranslations } from 'next-intl';
import type { FormFieldConfig } from '@/components/custom/form';

/**
 * A custom hook to easily translate static form field configurations.
 * Iterates through a given FormFieldConfig array and translates labels, placeholders, and descriptions.
 *
 * @param fields Static configuration of form fields
 * @param namespace The i18n namespace to use for these keys
 */
export function useTranslatedFields(
  fields: FormFieldConfig[],
  namespace: string
): FormFieldConfig[] {
  const t = useTranslations(namespace);

  return fields.map((field) => ({
    ...field,
    label: field.label ? t(field.label as any) : field.label,
    placeholder: field.placeholder
      ? t(field.placeholder as any)
      : field.placeholder,
    description: field.description
      ? t(field.description as any)
      : field.description,
  }));
}
