// d:\PROJECTS\eduflow\app\login\page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { AuthFormHeading } from '@/components/custom/auth/auth-form-heading';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('Email hoặc mật khẩu không đúng. Vui lòng thử lại.');
        console.error(result.error);
      } else {
        router.replace('/dashboard');
      }
    } catch (error) {
      setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <AuthFormHeading
        title="Welcome Back"
        description="Enter your credentials to access your workspace."
      />
      <div className="w-full space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block font-medium text-foreground text-sm"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-ring"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block font-medium text-foreground text-sm"
            >
              Mật khẩu
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-ring"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <button
              type="submit"
              className="w-full rounded-md border border-transparent bg-primary px-4 py-2 font-medium text-primary-foreground text-sm shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              Đăng nhập
            </button>
          </div>
          <p className="text-center text-muted-foreground text-sm">
            Chưa có tài khoản?
            <a href="/register" className="text-primary hover:underline">
              Đăng ký
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
