'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function AuthPageSwitcher() {
  const pathname = usePathname();
  const t = useTranslations('AuthPageSwitcher');

  const isLoginPage = pathname === '/login';
  const isRegisterPage = pathname === '/register';

  if (!isLoginPage && !isRegisterPage) {
    return null;
  }

  return (
    <p className="text-center text-muted-foreground text-sm">
      {isLoginPage ? (
        <>
          {t('newToAcademy')}{' '}
          <Link
            href="/register"
            className="font-semibold text-primary hover:underline"
          >
            {t('signUp')}
          </Link>
        </>
      ) : (
        <>
          {t('alreadyPart')}{' '}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            {t('signIn')}
          </Link>
        </>
      )}
    </p>
  );
}
