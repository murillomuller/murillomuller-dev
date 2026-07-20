'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/dashboard/jobs', label: 'Buscar', match: (p: string) => p === '/dashboard/jobs' },
  {
    href: '/dashboard/jobs/applied',
    label: 'Aplicadas',
    match: (p: string) => p.startsWith('/dashboard/jobs/applied'),
  },
  {
    href: '/dashboard/jobs/review',
    label: 'Revisar',
    match: (p: string) => p.startsWith('/dashboard/jobs/review'),
  },
  {
    href: '/dashboard/jobs/reports',
    label: 'Relatórios',
    match: (p: string) => p.startsWith('/dashboard/jobs/reports'),
  },
  {
    href: '/dashboard/jobs/prefs',
    label: 'Preferências',
    match: (p: string) => p.startsWith('/dashboard/jobs/prefs'),
  },
  {
    href: '/dashboard/jobs/linkedin',
    label: 'LinkedIn',
    match: (p: string) => p.startsWith('/dashboard/jobs/linkedin'),
  },
] as const;

export function JobsTabs() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-1 border-b border-[#2a2a2a] pb-px">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              active
                ? 'rounded-t border border-b-0 border-[#2a2a2a] bg-[#171717] px-4 py-2 text-sm font-semibold text-[#da0037]'
                : 'rounded-t px-4 py-2 text-sm text-[#afafaf] transition-colors hover:bg-[#1a1a1a] hover:text-[#ededed]'
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
