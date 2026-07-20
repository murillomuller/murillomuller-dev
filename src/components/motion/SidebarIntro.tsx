'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { gsap, registerGsap } from '@/lib/gsap';

type SidebarIntroProps = {
  children: ReactNode;
  className?: string;
};

/** One-shot intro for the profile sidebar (presence, not noise). */
export function SidebarIntro({ children, className }: SidebarIntroProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    registerGsap();
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      gsap.set(el, { opacity: 1, x: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, x: -24 },
        { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' }
      );

      const items = el.querySelectorAll('[data-intro-item]');
      if (items.length) {
        gsap.fromTo(
          items,
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.06,
            delay: 0.25,
            ease: 'power2.out',
          }
        );
      }
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <aside ref={ref} className={className} style={{ opacity: 0 }}>
      {children}
    </aside>
  );
}
