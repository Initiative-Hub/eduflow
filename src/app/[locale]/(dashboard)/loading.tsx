'use client';

import { Spinner } from '@/components/ui/spinner';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export default function DashboardLoading() {
  const t = useTranslations('Loading');
  return (
    <div className="flex flex-1 flex-col items-center justify-center space-y-4 py-32">
      <div className="relative">
        <div className="absolute h-16 w-16 animate-pulse rounded-full bg-primary/20" />
        <div className="relative rounded-full bg-card p-4 shadow-lg ring-1 ring-border">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-lg text-primary">{t('eduFlow')}</h3>
        <p className="text-muted-foreground text-sm">{t('oneMoment')}</p>
      </div>
      <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
        <motion.div
          animate={{
            x: [-96, 96],
          }}
          transition={{
            repeat: Number.POSITIVE_INFINITY,
            duration: 1.5,
            ease: 'easeInOut',
          }}
          className="h-full w-full bg-primary"
        />
      </div>
    </div>
  );
}
