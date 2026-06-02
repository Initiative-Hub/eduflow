'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  GraduationCap,
  Presentation,
  Sparkles,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AllSetScreen } from '@/components/role-selection/all-set-screen';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import {
  ambientGlowVariants,
  containerVariants,
  itemVariants,
} from './role.config';
import { useRole } from './use-role';

export function RoleClient() {
  const t = useTranslations('RoleSelection');
  const { handleRoleSelect, isSelecting, isSuccess, selectingRole } = useRole();

  return (
    <>
      <AllSetScreen isVisible={isSuccess} />
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 selection:bg-primary/20">
        <motion.div
          variants={ambientGlowVariants}
          animate="animate"
          className="pointer-events-none absolute top-[-20%] right-[-10%] h-125 w-125 rounded-full bg-primary/10 blur-[120px]"
        />
        <motion.div
          variants={ambientGlowVariants}
          animate="animate"
          className="pointer-events-none absolute bottom-[-15%] left-[-10%] h-112 w-md rounded-full bg-secondary/10 blur-[120px]"
        />

        {/* Hero Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 mb-16 w-full max-w-4xl text-center"
        >
          <motion.h1
            variants={itemVariants}
            className="mb-6 font-black text-3xl leading-[1.1] tracking-tighter md:text-5xl lg:text-6xl"
          >
            {t.rich('title', {
              brand: (children) => (
                <span className="relative inline-block text-primary">
                  {children}
                  <motion.span
                    className="absolute -bottom-2 left-0 h-2 w-full rounded-full bg-primary/20"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                  />
                </span>
              ),
            })}
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="balance mx-auto max-w-2xl font-medium text-base text-muted-foreground md:text-lg lg:text-xl"
          >
            {t('description')}
          </motion.p>
        </motion.div>

        {/* Role Selection Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 grid w-full max-w-4xl grid-cols-1 gap-6 px-4 md:grid-cols-2"
        >
          {/* Student Role Card */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -8 }}
            className="group relative flex flex-col items-center rounded-3xl border border-primary/5 bg-card/60 p-8 text-center shadow-2xl shadow-primary/5 backdrop-blur-xl transition-all duration-500 hover:border-primary/30 hover:shadow-primary/10"
          >
            {/* Decorative Corner Label */}
            <div className="absolute top-6 right-6 overflow-hidden">
              <motion.div className="translate-x-4 transform opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100">
                <span className="flex items-center gap-1.5 font-black text-[10px] text-primary/60 uppercase tracking-[0.2em]">
                  <Sparkles className="h-3 w-3" />
                  {t('student.path')}
                </span>
              </motion.div>
            </div>

            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-4 ring-transparent transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 group-hover:ring-primary/5">
              <GraduationCap
                className="h-10 w-10 text-primary"
                strokeWidth={1.5}
              />
            </div>

            <h2 className="mb-3 font-black text-2xl tracking-tight transition-colors group-hover:text-primary lg:text-3xl">
              {t('student.role')}
            </h2>

            <p className="balance mb-8 font-medium text-base text-muted-foreground leading-relaxed">
              {t('student.description')}
            </p>

            <Button
              onClick={() => handleRoleSelect('STUDENT')}
              disabled={isSelecting}
              className="mt-auto h-12 w-full cursor-pointer rounded-xl bg-primary font-bold text-lg text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:bg-primary/90 active:scale-[0.98]"
            >
              {selectingRole === 'STUDENT' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="h-5 w-5 rounded-full border-2 border-primary-foreground border-t-transparent"
                />
              ) : (
                t('actions.select')
              )}
            </Button>
          </motion.div>

          {/* Educator Role Card */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -8 }}
            className="group relative flex flex-col items-center rounded-3xl border border-secondary/5 bg-card/60 p-8 text-center shadow-2xl shadow-secondary/5 backdrop-blur-xl transition-all duration-500 hover:border-secondary/30 hover:shadow-secondary/10"
          >
            {/* Decorative Corner Label */}
            <div className="absolute top-6 right-6 overflow-hidden">
              <motion.div className="translate-x-4 transform opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100">
                <span className="flex items-center gap-1.5 font-black text-[10px] text-secondary/60 uppercase tracking-[0.2em]">
                  <Sparkles className="h-3 w-3" />
                  {t('educator.path')}
                </span>
              </motion.div>
            </div>

            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary/10 ring-4 ring-transparent transition-all duration-500 group-hover:-rotate-6 group-hover:scale-110 group-hover:ring-secondary/5">
              <Presentation
                className="h-10 w-10 text-secondary"
                strokeWidth={1.5}
              />
            </div>

            <h2 className="mb-3 font-black text-2xl tracking-tight transition-colors group-hover:text-secondary lg:text-3xl">
              {t('educator.role')}
            </h2>

            <p className="balance mb-8 font-medium text-base text-muted-foreground leading-relaxed">
              {t('educator.description')}
            </p>

            <Button
              variant="outline"
              onClick={() => handleRoleSelect('TEACHER')}
              disabled={isSelecting}
              className="mt-auto h-12 w-full cursor-pointer rounded-xl border-2 border-secondary/20 font-bold text-lg transition-all duration-300 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary active:scale-[0.98]"
            >
              {selectingRole === 'TEACHER' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="h-5 w-5 rounded-full border-2 border-secondary border-t-transparent"
                />
              ) : (
                t('actions.select')
              )}
            </Button>
          </motion.div>
        </motion.div>

        {/* Footer Link */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="mt-16 flex flex-col items-center gap-3 text-center"
        >
          <p className="font-bold text-muted-foreground/50 text-xs tracking-wide">
            {t('partner.question')}
          </p>
          <Link
            href="/register-university"
            className="group relative flex cursor-pointer items-center gap-2 px-6 py-2 font-black text-primary tracking-tight transition-all"
          >
            {t('partner.action')}
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="h-4 w-4" />
            </motion.div>
            <span className="absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0 bg-primary/30 transition-transform duration-300 group-hover:scale-x-100" />
          </Link>
        </motion.div>
      </div>
    </>
  );
}
