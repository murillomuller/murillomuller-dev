'use client';

import { useEffect, useRef } from 'react';
import { gsap, registerGsap } from '@/lib/gsap';

type Skill = {
  id: number;
  name: string;
  level: number;
};

export function SkillBars({ skills }: { skills: Skill[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerGsap();
    const root = ref.current;
    if (!root) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bars = root.querySelectorAll<HTMLElement>('[data-skill-bar]');

    if (prefersReduced) {
      bars.forEach((bar) => {
        bar.style.width = `${bar.dataset.level || 0}%`;
      });
      return;
    }

    const ctx = gsap.context(() => {
      bars.forEach((bar) => {
        gsap.fromTo(
          bar,
          { width: '0%' },
          {
            width: `${bar.dataset.level || 0}%`,
            duration: 0.9,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: bar,
              start: 'top 90%',
              toggleActions: 'play none none none',
            },
          }
        );
      });
    }, root);

    return () => ctx.revert();
  }, [skills]);

  return (
    <div ref={ref} className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
      {skills.map((s) => (
        <div key={s.id} className="mb-2">
          <div className="mb-1 flex justify-between text-sm">
            <span>{s.name}</span>
            <span className="text-xs text-text-secondary">
              {s.level >= 90 ? 'Advanced' : s.level >= 70 ? 'Intermediary' : 'Basic'}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#111]">
            <div
              data-skill-bar
              data-level={s.level}
              className="h-1.5 rounded-full bg-primary"
              style={{ width: 0 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
