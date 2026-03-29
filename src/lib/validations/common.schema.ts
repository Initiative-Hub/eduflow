import { z } from 'zod';

// Password validation regex (at least 8 characters, 1 number, 1 special character, and 1 uppercase letter)
export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$#@!])[A-Za-z\d$#@!]{8,}$/;

// Phone validation regex (digits only, max 12 digits)
export const phoneRegex = /^\d{1,12}$/;

// Email validation regex
export const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Date validation regex (DD/MM/YYYY)
export const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/\d{4}$/;

export const authSchema = z.object({
  email: z
    .string()
    .regex(emailRegex, 'Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      passwordRegex,
      'Password must contain at least 1 number, 1 special character ($#@!), and 1 capitalized letter'
    ),
});
