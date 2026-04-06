// components/AuthSync.tsx
'use client';

import { useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { useAppStore } from '@/store/useAppState';

export function AuthSync() {
  const { isPending } = useSession();
  const setLoading = useAppStore((state) => state.setLoading);

  useEffect(() => {
    setLoading(isPending);
  }, [isPending, setLoading]);

  return null;
}
