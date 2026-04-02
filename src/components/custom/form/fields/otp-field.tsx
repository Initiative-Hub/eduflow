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
    <div className="flex justify-center">
      <InputOTP
        id={field.name}
        maxLength={otpLength}
        pattern={REGEXP_ONLY_DIGITS}
        value={(formField.value as string) ?? ''}
        onChange={formField.onChange}
        onBlur={formField.onBlur}
        disabled={field.disabled}
        containerClassName="w-full justify-center"
      >
        <InputOTPGroup className="w-full justify-center gap-2 bg-transparent md:w-auto md:gap-3">
          {Array.from({ length: otpLength }).map((_, index) => (
            <InputOTPSlot
              key={`${field.name}-otp-slot-${index + 1}`}
              index={index}
              className="h-12 w-12 rounded-xl border-0 bg-primary/10 text-base first:rounded-xl last:rounded-xl data-[active=true]:border-0 data-[active=true]:bg-primary/15 data-[active=true]:ring-2 data-[active=true]:ring-primary/30"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
};
