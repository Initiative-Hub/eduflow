import { REGEXP_ONLY_DIGITS } from 'input-otp';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import type { FormFieldConfig } from '../form.types';

export const OtpField = ({
  field,
  formField,
}: {
  field: FormFieldConfig;
  formField: any;
}) => {
  const otpLength = field.otpLength ?? 4;

  return (
    <div className="flex justify-start md:justify-center">
      <InputOTP
        id={field.name}
        maxLength={otpLength}
        pattern={REGEXP_ONLY_DIGITS}
        value={(formField.value as string) ?? ''}
        onChange={formField.onChange}
        onBlur={formField.onBlur}
        disabled={field.disabled}
        containerClassName="w-full md:w-auto"
      >
        <InputOTPGroup className="w-full md:w-auto">
          {Array.from({ length: otpLength }).map((_, index) => (
            <InputOTPSlot
              key={`${field.name}-otp-slot-${index + 1}`}
              index={index}
              className="h-11 w-full text-base md:w-11"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
};
