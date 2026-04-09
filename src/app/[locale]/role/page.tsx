'use client';

import { useTranslations } from 'next-intl';
import { motion, type Variants } from 'framer-motion';
import { GraduationCap, Presentation, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

/**
 * RoleSelectionPage - A premium role selection interface for the EduFlow ecosystem.
 * Design follows Material Design 3 principles with refined aesthetics, smooth animations,
 * and clear path differentiation for Students and Educators.
 */
export default function RoleSelectionPage() {
  const t = useTranslations('RoleSelection');

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 70,
        damping: 15,
      },
    },
  };

  const ambientGlowVariants: Variants = {
    animate: {
      scale: [1, 1.1, 1],
      opacity: [0.5, 0.8, 0.5],
      transition: {
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center overflow-hidden py-12 px-4 selection:bg-primary/20">
      {/* Abstract Background Design Elements */}
      <motion.div 
        variants={ambientGlowVariants}
        animate="animate"
        className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" 
      />
      <motion.div 
        variants={ambientGlowVariants}
        animate="animate"
        className="absolute bottom-[-15%] left-[-10%] w-[450px] h-[450px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" 
      />

      {/* Hero Section */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl w-full text-center mb-16 relative z-10"
      >
        <motion.h1 
          variants={itemVariants}
          className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-8 leading-[1.1]"
        >
          {t.rich('title', {
            brand: (children) => (
              <span className="relative inline-block text-primary">
                {children}
                <motion.span 
                  className="absolute -bottom-2 left-0 w-full h-2 bg-primary/20 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                />
              </span>
            )
          })}
        </motion.h1>
        <motion.p 
          variants={itemVariants}
          className="text-muted-foreground text-lg md:text-xl lg:text-2xl max-w-2xl mx-auto font-medium balance"
        >
          {t('description')}
        </motion.p>
      </motion.div>

      {/* Role Selection Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-5xl relative z-10 px-4"
      >
        {/* Student Role Card */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -8 }}
          className="group relative bg-card/60 backdrop-blur-xl rounded-3xl p-12 flex flex-col items-center text-center transition-all duration-500 shadow-2xl shadow-primary/5 border border-primary/5 hover:border-primary/30 hover:shadow-primary/10"
        >
          {/* Decorative Corner Label */}
          <div className="absolute top-8 right-8 overflow-hidden">
            <motion.div 
              className="opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-4 group-hover:translate-x-0"
            >
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-primary/60 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                {t('student.path')}
              </span>
            </motion.div>
          </div>

          <div className="w-28 h-28 rounded-[2.5rem] bg-primary/10 flex items-center justify-center mb-10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ring-4 ring-transparent group-hover:ring-primary/5">
            <GraduationCap className="text-primary w-14 h-14" strokeWidth={1.5} />
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-black mb-5 tracking-tight group-hover:text-primary transition-colors">
            {t('student.role')}
          </h2>
          
          <p className="text-muted-foreground text-lg mb-12 leading-relaxed font-medium balance">
            {t('student.description')}
          </p>
          
          <Button 
            className="mt-auto w-full h-16 text-xl font-black rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 active:scale-[0.98]"
          >
            {t('actions.select')}
          </Button>
        </motion.div>

        {/* Educator Role Card */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -8 }}
          className="group relative bg-card/60 backdrop-blur-xl rounded-3xl p-12 flex flex-col items-center text-center transition-all duration-500 shadow-2xl shadow-secondary/5 border border-secondary/5 hover:border-secondary/30 hover:shadow-secondary/10"
        >
          {/* Decorative Corner Label */}
          <div className="absolute top-8 right-8 overflow-hidden">
            <motion.div 
              className="opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-4 group-hover:translate-x-0"
            >
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-secondary/60 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                {t('educator.path')}
              </span>
            </motion.div>
          </div>

          <div className="w-28 h-28 rounded-[2.5rem] bg-secondary/10 flex items-center justify-center mb-10 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6 ring-4 ring-transparent group-hover:ring-secondary/5">
            <Presentation className="text-secondary w-14 h-14" strokeWidth={1.5} />
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-black mb-5 tracking-tight group-hover:text-secondary transition-colors">
            {t('educator.role')}
          </h2>
          
          <p className="text-muted-foreground text-lg mb-12 leading-relaxed font-medium balance">
            {t('educator.description')}
          </p>
          
          <Button 
            variant="outline"
            className="mt-auto w-full h-16 text-xl font-black rounded-2xl border-2 border-secondary/20 hover:bg-secondary/5 hover:text-secondary hover:border-secondary/40 transition-all duration-300 active:scale-[0.98]"
          >
            {t('actions.select')}
          </Button>
        </motion.div>
      </motion.div>

      {/* Footer Link */}
      <motion.div 
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="mt-24 flex flex-col items-center gap-4 text-center"
      >
        <p className="text-sm font-bold text-muted-foreground/50 tracking-wide">
          {t('partner.question')}
        </p>
        <Link 
          href="/register-university"
          className="group relative px-6 py-2 text-primary font-black tracking-tight flex items-center gap-2 transition-all"
        >
          {t('partner.action')}
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ArrowRight className="w-4 h-4" />
          </motion.div>
          <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary/30 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
        </Link>
      </motion.div>
    </div>
  );
}
