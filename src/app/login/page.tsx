// d:\PROJECTS\eduflow\app\login\page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-center font-bold text-2xl text-gray-900">
          Đăng nhập
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block font-medium text-gray-700 text-sm"
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
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block font-medium text-gray-700 text-sm"
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
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <button
              type="submit"
              className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-2 font-medium text-sm text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Đăng nhập
            </button>
            <div>
              <Button
                type="button"
                className="w-full border-gray-300 bg-white text-black"
                onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM16.9899 10.0001H16.6665V10.0001H12V12H14.6665C14.3331 13.3334 13.3331 14.6667 12 14.6667C10.6665 14.6667 9.6665 13.3334 9.3331 12C9.3331 10.6667 10.6665 9.33337 12 9.33337C12.6665 9.33337 13.3331 9.6667 13.6665 10.0001H16.9899Z"
                    fill="#4285F4"
                  />
                </svg>
                Sign In with Google
              </Button>
            </div>
          </div>
          <p className="text-center text-gray-600 text-sm">
            Chưa có tài khoản?
            <a href="/register" className="text-indigo-600 hover:underline">
              Đăng ký
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
