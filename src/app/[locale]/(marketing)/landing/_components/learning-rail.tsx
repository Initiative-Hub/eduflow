'use client';

import type { LucideIcon } from 'lucide-react';
import {
  BookOpenCheck,
  FileText,
  MessageCircleQuestion,
  Presentation,
} from 'lucide-react';
import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Reveal } from './reveal';
import { useLandingReducedMotion } from './use-landing-reduced-motion';

interface RailNode {
  description: string;
  icon: LucideIcon;
  label: string;
}

interface LearningRailProps {
  ariaLabel: string;
  nodes: {
    assessment: { description: string; label: string };
    lesson: { description: string; label: string };
    source: { description: string; label: string };
    tutor: { description: string; label: string };
  };
}

export function LearningRail({ ariaLabel, nodes }: LearningRailProps) {
  const rail = useRef<HTMLDivElement>(null);
  const inView = useInView(rail, { once: true, amount: 0.15 });
  const reduceMotion = useLandingReducedMotion();
  const railNodes: RailNode[] = [
    { ...nodes.source, icon: FileText },
    { ...nodes.lesson, icon: Presentation },
    { ...nodes.tutor, icon: MessageCircleQuestion },
    { ...nodes.assessment, icon: BookOpenCheck },
  ];

  return (
    <div
      ref={rail}
      className="relative mx-auto w-full max-w-2xl rounded-3xl border bg-card/80 p-4 shadow-2xl shadow-primary/10 backdrop-blur sm:p-6"
      role="img"
      aria-label={ariaLabel}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div className="absolute -top-20 -right-20 size-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 size-48 rounded-full bg-secondary/15 blur-3xl" />
      </div>
      <svg
        aria-hidden="true"
        viewBox="0 0 620 390"
        className="pointer-events-none absolute inset-0 hidden size-full text-primary/45 sm:block"
        fill="none"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M155 96 C250 96 210 195 310 195 C410 195 370 294 465 294"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="8 10"
          initial={false}
          animate={
            inView && reduceMotion === false
              ? { pathLength: [0, 1] }
              : { pathLength: 1 }
          }
          transition={{ duration: reduceMotion ? 0 : 1.4, ease: 'easeInOut' }}
        />
      </svg>
      <div className="relative grid gap-4 sm:grid-cols-2 sm:gap-6">
        {railNodes.map(({ description, icon: Icon, label }, index) => (
          <div
            key={label}
            className={index % 2 === 1 ? 'sm:translate-y-16' : undefined}
          >
            <Reveal delay={0.12 + index * 0.1} className="h-full">
              <Card className="h-full min-h-36">
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <span
                      aria-hidden="true"
                      className="font-heading text-primary/40 text-sm tabular-nums"
                    >
                      0{index + 1}
                    </span>
                  </div>
                  <CardTitle>{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-6">
                    {description}
                  </p>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        ))}
      </div>
      <div className="h-0 sm:h-16" />
    </div>
  );
}
