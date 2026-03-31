'use client';

import { AuthFormHeading } from '@/components/custom/auth/auth-form-heading';
import { FormTemplate } from '@/components/custom/form/form';
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
          submitLabel="Register"
          isLoading={isLoading}
        >
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </FormTemplate>
      </div>
    </div>
  );
}
