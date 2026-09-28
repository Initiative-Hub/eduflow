'use client';

import { useInView } from 'motion/react';
import { useAnimate } from 'motion/react-mini';
import { type ReactNode, useEffect, useRef } from 'react';
import { useLandingReducedMotion } from './use-landing-reduced-motion';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/** Keep server-rendered content visible; enhance it only after it enters view. */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const inView = useInView(scope, { once: true, amount: 0.15 });
  const reduceMotion = useLandingReducedMotion();
  const hasRevealed = useRef(false);
  const animation = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    if (!inView || reduceMotion !== false || hasRevealed.current) return;

    hasRevealed.current = true;
    animation.current = animate(
      scope.current,
      { opacity: [0, 1], transform: ['translateY(20px)', 'translateY(0px)'] },
      { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }
    );

    // Finish immediately if the preference changes or the component unmounts.
    return () => animation.current?.complete();
  }, [animate, delay, inView, reduceMotion, scope]);

  return (
    <div
      ref={scope}
      className={className}
      onFocusCapture={() => {
        hasRevealed.current = true;
        animation.current?.complete();
      }}
    >
      {children}
    </div>
  );
}
