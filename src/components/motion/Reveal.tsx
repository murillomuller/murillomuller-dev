'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { gsap, registerGsap } from '@/lib/gsap';

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Vertical offset in px before reveal */
  y?: number;
  delay?: number;
  duration?: number;
};

/** Scroll-triggered fade/slide-in. Reusable for future section motion. */
export function Reveal({
  children,
  className,
  y = 28,
  delay = 0,
  duration = 0.7,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerGsap();
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [y, delay, duration]);

  return (
    <div ref={ref} className={className} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
