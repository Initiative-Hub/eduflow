'use client';

import { AuthFormHeading } from '@/components/auth/auth-form-heading';
import { FormTemplate } from '@/components/custom/form';
import {
  registerDefaultValues,
  registerFields,
  registerSchema,
} from './register.config';
import { useRegister } from './use-register';

export default function RegisterPage() {
  const { error, isLoading, handleSubmit } = useRegister();

  return (
    <div className="space-y-6">
      <AuthFormHeading
        title="Join the Academy"
        description="Begin your journey in the living library."
      />
      <div className="w-full space-y-6">
        <FormTemplate
          schema={registerSchema}
          defaultValues={registerDefaultValues}
          fields={registerFields}
          onSubmit={handleSubmit}
          submitLabel="Create Account"
          isLoading={isLoading}
        >
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </FormTemplate>

        <p className="px-6 text-center text-muted-foreground text-sm">
          By signing up, you agree to the{' '}
          <span className="cursor-pointer text-primary hover:underline">
            Terms of Service
          </span>{' '}
          and our{' '}
          <span className="cursor-pointer text-primary hover:underline">
            Privacy Policy.
          </span>
        </p>
      </div>
    </div>
  );
}
