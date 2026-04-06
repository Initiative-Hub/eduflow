'use client';

import { AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Loader from '@/components/loader';
import { useLoadingStore } from '@/stores/useLoadingStore';

export function GlobalLoader() {
  const pathname = usePathname();
  const isLoading = useLoadingStore((state) => state.isLoading);
  const setLoading = useLoadingStore((state) => state.setLoading);

  useEffect(() => {
    if (pathname) {
      setLoading(false);
    }
  }, [pathname, setLoading]);

  return <AnimatePresence>{isLoading && <Loader />}</AnimatePresence>;
}
