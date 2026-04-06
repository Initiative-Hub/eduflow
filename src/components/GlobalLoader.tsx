'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { useLoadingStore } from '@/store/useLoadingStore';

export function GlobalLoader() {
  const pathname = usePathname();
  const isLoading = useLoadingStore((state) => state.isLoading);
  const setLoading = useLoadingStore((state) => state.setLoading);
  const t = useTranslations('Loading');

  useEffect(() => {
    if (pathname) {
      setLoading(false);
    }
  }, [pathname, setLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-background/60 backdrop-blur-md"
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute h-24 w-24 animate-pulse rounded-full bg-primary/20" />
            <div className="absolute h-20 w-20 animate-ping rounded-full bg-primary/10" />
            <div className="relative rounded-full bg-card p-6 shadow-2xl ring-1 ring-border">
              <Spinner className="h-10 w-10 text-primary" />
            </div>
          </div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex flex-col items-center space-y-2"
          >
            <h2 className="font-bold text-2xl text-primary tracking-tight">
              {t('eduFlow')}
            </h2>
            <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
              <motion.div
                animate={{
                  x: [-48, 48],
                }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 1.5,
                  ease: 'easeInOut',
                }}
                className="h-full w-full bg-primary"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
