'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AuthPageSwitcher() {
  const pathname = usePathname();

  const isLoginPage = pathname === '/login';
  const isRegisterPage = pathname === '/register';

  if (!isLoginPage && !isRegisterPage) {
    return null;
  }

  return (
    <p className="text-center text-muted-foreground text-sm">
      {isLoginPage ? (
        <>
          New to the academy?{' '}
          <Link
            href="/register"
            className="font-semibold text-primary hover:underline"
          >
            Sign Up
          </Link>
        </>
      ) : (
        <>
          Already part of us?{' '}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Sign In
          </Link>
        </>
      )}
    </p>
  );
}
