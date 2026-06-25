'use client';

import { Check, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';

interface AllSetScreenProps {
  isVisible: boolean;
}

export function AllSetScreen({ isVisible }: AllSetScreenProps) {
  const t = useTranslations('RoleSelection.success');

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-100 flex items-center justify-center bg-transparent backdrop-blur-2xl"
        >
          <div className="relative flex flex-col items-center justify-center p-8 text-center">
            {/* Animated Glow Background */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute h-64 w-64 rounded-full bg-primary/20 blur-3xl"
            />

            {/* Success Icon Container */}
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 20,
                delay: 0.1,
              }}
              className="relative mb-10 flex h-32 w-32 items-center justify-center rounded-[2.5rem] bg-primary shadow-2xl shadow-primary/40"
            >
              <Check
                className="h-16 w-16 text-primary-foreground"
                strokeWidth={3}
              />

              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-4 rounded-[3rem] border border-primary/30 border-dashed"
              />
            </motion.div>

            {/* Text Content */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="relative z-10"
            >
              <div className="mb-4 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-black text-primary text-xs uppercase tracking-[0.3em]">
                  Confirmed
                </span>
                <Sparkles className="h-5 w-5 text-primary" />
              </div>

              <h1 className="mb-4 font-black text-5xl tracking-tighter md:text-7xl">
                {t('title')}
              </h1>

              <p className="mx-auto max-w-md font-medium text-muted-foreground text-xl leading-relaxed">
                {t('description')}
              </p>
            </motion.div>

            {/* Progress Bar (Visual only to show movement to workspace) */}
            <div className="mt-12 h-1.5 w-64 overflow-hidden rounded-full bg-primary/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.5, ease: 'easeInOut' }}
                className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
