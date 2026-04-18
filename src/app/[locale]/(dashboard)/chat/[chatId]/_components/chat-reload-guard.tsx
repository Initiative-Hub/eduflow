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
    const isReload = navigationEntry?.type === 'reload';

    if (isReload) {
      router.replace('/');
    }
  }, [router]);

  return null;
}
