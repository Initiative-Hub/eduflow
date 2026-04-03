'use client';

import { useTranslations } from 'next-intl';
import { useLogout } from './use-logout';

export default function LogoutButton() {
  const t = useTranslations('Common');
  const { handleLogout, isLoggingOut } = useLogout();

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="w-full rounded-md px-4 py-2 text-left hover:bg-gray-700"
    >
      {t('logout')}
    </button>
  );
}
