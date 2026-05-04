'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Search' },
  { href: '/popular', label: 'Popular' },
  { href: '/settings', label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-neutral-800 bg-neutral-950 p-4">
      <div className="text-lg font-semibold">DeepDive</div>
      <nav className="mt-4 flex flex-col gap-1">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={[
                'rounded-lg px-3 py-2 text-sm',
                active ? 'bg-neutral-900 text-neutral-100' : 'text-neutral-300 hover:bg-neutral-900/60',
              ].join(' ')}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}