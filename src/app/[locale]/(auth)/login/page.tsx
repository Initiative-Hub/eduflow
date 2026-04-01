'use client';

import { AuthFormHeading } from '@/components/custom/auth/auth-form-heading';
import { FormTemplate } from '@/components/custom/form/form';
import { loginDefaultValues, loginFields, loginSchema } from './login.config';
import { useLogin } from './use-login';

export default function LoginPage() {
  const { error, isLoading, handleSubmit } = useLogin();

  return (
    <div className="space-y-6">
      <AuthFormHeading
        title="Welcome Back"
        description="Enter your credentials to access your workspace."
      />
      <div className="w-full space-y-6">
        <FormTemplate
          schema={loginSchema}
          defaultValues={loginDefaultValues}
          fields={loginFields}
          onSubmit={handleSubmit}
          submitLabel={isLoading ? 'Signing in...' : 'Sign In'}
          isLoading={isLoading}
        >
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </FormTemplate>
      </div>
    </div>
  );
}
