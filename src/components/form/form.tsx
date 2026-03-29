import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import {
  Controller,
  type DefaultValues,
  type FieldValues,
  FormProvider,
  useForm,
} from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '../ui/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '../ui/field';
import type { FormFieldConfig } from './form.types';
import { FieldRenderer } from './form-fields';

interface FormTemplateProps<TData extends FieldValues> {
  schema: z.ZodType<TData, any, any>;
  defaultValues: DefaultValues<TData>;
  fields: FormFieldConfig[];
  onSubmit: (data: TData) => void;
  submitLabel?: string;
  className?: string;
  isLoading?: boolean;
  children?: ReactNode;
  form?: UseFormReturn<TData>;
}

export function FormTemplate<TData extends FieldValues>({
  schema,
  defaultValues,
  fields,
  onSubmit,
  submitLabel = 'Submit',
  className = '',
  children,
  form: externalForm,
}: FormTemplateProps<TData>) {
  const defaultForm = useForm<TData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  // For scenarios where parents need to own the form instance
  const form = externalForm || defaultForm;

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={`flex flex-col gap-6 ${className}`}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <Controller
              key={field.name}
              control={form.control}
              name={field.name as any}
              render={({ field: formField, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  className={`${field.colSpan === 1 ? 'col-span-1' : 'col-span-1 md:col-span-2'}`}
                >
                  {field.type !== 'switch' && (
                    <>
                      <FieldLabel className="text-sm">
                        {field.label}
                        {field.required && (
                          <span className="text-destructive">*</span>
                        )}
                      </FieldLabel>
                      {field.description && (
                        <FieldDescription className="text-muted-foreground text-xs dark:text-gray-400">
                          {field.description}
                        </FieldDescription>
                      )}
                    </>
                  )}

                  <FieldContent>
                    <FieldRenderer field={field} formField={formField} />
                  </FieldContent>

                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          ))}
        </div>

        {children}

        <Button
          type="submit"
          className="w-full cursor-pointer font-bold transition-all duration-200 hover:shadow-lg"
        >
          {submitLabel}
        </Button>
      </form>
    </FormProvider>
  );
}
