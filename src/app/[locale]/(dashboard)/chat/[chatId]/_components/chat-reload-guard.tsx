'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';

export function ChatReloadGuard() {
  const router = useRouter();

  useEffect(() => {
    if (typeof performance === 'undefined') return;

    const entries = performance.getEntriesByType('navigation');
    const navigationEntry = entries[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (!navigationEntry || navigationEntry.type !== 'reload') return;
    if (typeof window === 'undefined') return;

    try {
      const navigationUrl = new URL(navigationEntry.name);
      const currentPath = window.location.pathname;

      if (navigationUrl.pathname !== currentPath) return;
      router.replace('/');
    } catch {
      router.replace('/');
    }
  }, [router]);

  return null;
}
