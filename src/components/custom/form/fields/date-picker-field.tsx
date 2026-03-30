import { format, parse } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { FormFieldConfig } from '../form.types';

export const DatePickerField = ({
  field,
  formField,
}: {
  field: FormFieldConfig;
  formField: any;
}) => {
  const dateValue = formField.value
    ? typeof formField.value === 'string'
      ? parse(formField.value, 'dd/MM/yyyy', new Date())
      : formField.value
    : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={field.name}
          type="button"
          variant="outline"
          className={cn(
            'w-full pl-3 text-left font-normal',
            !formField.value && 'text-muted-foreground'
          )}
        >
          {dateValue ? (
            format(dateValue, 'dd/MM/yyyy')
          ) : (
            <span>{field.placeholder || 'Pick a date'}</span>
          )}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={(date) => {
            if (date) {
              formField.onChange(format(date, 'dd/MM/yyyy'));
            }
          }}
          disabled={(date) =>
            date > new Date() || date < new Date('1900-01-01')
          }
          autoFocus
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
};
