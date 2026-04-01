'use client';

import Link from 'next/link';
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
          <div className="flex items-start justify-between gap-3">
            {error && (
              <p className="wrap-break-word min-w-0 flex-1 text-red-600 text-sm">
                {error}
              </p>
            )}

            <div className="shrink-0 whitespace-nowrap text-right">
              <Link
                href="/forgot-password"
                className="text-primary text-sm hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        </FormTemplate>
      </div>
    </div>
  );
}
