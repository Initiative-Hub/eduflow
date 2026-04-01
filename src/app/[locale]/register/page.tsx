'use client';

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
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-center font-bold text-2xl text-gray-900">
          Register
        </h1>

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
