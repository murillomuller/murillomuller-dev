'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/profile', label: 'Profile & About' },
  { href: '/dashboard/experience', label: 'Experience' },
  { href: '/dashboard/skills', label: 'Skills' },
  { href: '/dashboard/education', label: 'Education' },
  { href: '/dashboard/portfolio', label: 'Portfolio' },
  { href: '/dashboard/jobs', label: 'Vagas' },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {nav.map((item) => {
        const active =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? 'rounded bg-[#222] px-3 py-2 text-sm text-white'
                : 'rounded px-3 py-2 text-sm text-[#afafaf] transition-colors hover:bg-[#222] hover:text-white'
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
