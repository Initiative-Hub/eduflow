'use client';

import Loader from '@/components/loader';
import { useLoadingStore } from '@/stores/useLoadingStore';

export function GlobalLoader() {
  const isLoading = useLoadingStore((state) => state.isLoading);
  if (!isLoading) return null;

  return <Loader />;
}
