// components/AuthSync.tsx
'use client';

import { useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { useLoadingStore } from '@/stores/useLoadingStore';

export function AuthSync() {
  const { isPending } = useSession();
  const setLoading = useLoadingStore((state) => state.setLoading);

  useEffect(() => {
    setLoading(isPending);
  }, [isPending, setLoading]);

  return null;
}
