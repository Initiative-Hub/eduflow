import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { FormFieldConfig } from '../form.types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const InputField = ({
  field,
  formField,
}: {
  field: FormFieldConfig;
  formField: any;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const isPassword = field.type === 'password';
  const inputType = isPassword ? (isVisible ? 'text' : 'password') : field.type;

  const toggleVisibility = () => setIsVisible(!isVisible);

  return (
    <div className="relative">
      {field.startAdornment && (
        <div className="absolute left-3 self-center text-gray-500 text-sm">
          {field.startAdornment}
        </div>
      )}
      <Input
        id={field.name}
        type={inputType}
        placeholder={field.placeholder}
        disabled={field.disabled}
        className={`w-full py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-offset-2 ${
          field.startAdornment ? 'pl-12' : 'px-4'
        } ${field.endAdornment || isPassword ? 'pr-10' : 'pr-4'}`}
        {...formField}
      />

      {isPassword ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleVisibility}
          className="absolute top-1/2 right-0 h-full -translate-y-1/2 px-3 text-gray-500 hover:bg-transparent hover:text-gray-700"
        >
          {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
        </Button>
      ) : (
        field.endAdornment && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 text-sm">
            {field.endAdornment}
          </div>
        )
      )}
    </div>
  );
};
