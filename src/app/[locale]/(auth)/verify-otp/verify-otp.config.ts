import { z } from 'zod';
import type { FormFieldConfig } from '@/components/custom/form';

export type VerifyOtpFormData = {
  otp: string;
};

export const verifyOtpSchema = z.object({
  otp: z
    .string()
    .min(1, 'OTP code is required.')
    .regex(/^\d{6}$/, 'OTP code must be exactly 6 digits.'),
});

export const verifyOtpFields: FormFieldConfig[] = [
  {
    name: 'otp',
    label: '',
    type: 'otp',
    otpLength: 6,
    required: true,
    colSpan: 2,
  },
];

export const verifyOtpDefaultValues: VerifyOtpFormData = {
  otp: '',
};
