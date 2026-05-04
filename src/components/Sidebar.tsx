'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 10.5V21h13V10.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-3.6-3.6" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3.5l2.7 5.6 6.2.9-4.5 4.4 1.1 6.2L12 18.3 6.5 21l1.1-6.2L3.1 10l6.2-.9L12 3.5z" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" />
      <path d="M19.4 13.1c.04-.36.06-.73.06-1.1s-.02-.74-.06-1.1l2.06-1.6-2-3.46-2.48 1a8.3 8.3 0 0 0-1.9-1.1l-.38-2.64H9.3l-.38 2.64c-.67.27-1.31.63-1.9 1.1l-2.48-1-2 3.46 2.06 1.6c-.04.36-.06.73-.06 1.1s.02.74.06 1.1L2.54 14.7l2 3.46 2.48-1c.59.47 1.23.83 1.9 1.1l.38 2.64h5.4l.38-2.64c.67-.27 1.31-.63 1.9-1.1l2.48 1 2-3.46-2.06-1.6z" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname() || '/';
  const [expanded, setExpanded] = useState(false);

  const items: NavItem[] = useMemo(
    () => [
      { href: '/', label: 'Home', icon: <IconHome /> },
      { href: '/search', label: 'Search', icon: <IconSearch /> },
      { href: '/popular', label: 'Popular', icon: <IconStar /> },
      { href: '/settings', label: 'Settings', icon: <IconSettings /> },
    ],
    [],
  );

  return (
    <aside
      className={[
        'sticky top-0 h-screen border-r border-slate-800 bg-slate-950/90 backdrop-blur',
        'transition-[width] duration-200 ease-out',
        expanded ? 'w-56' : 'w-16',
      ].join(' ')}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      aria-label="Primary"
    >
      <div className="flex h-14 items-center justify-center px-2">
        <div
          className={[
            'flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/40',
            expanded ? 'h-9 w-full px-3' : 'h-9 w-9',
          ].join(' ')}
        >
          <span className="text-sm font-semibold tracking-wide text-slate-100">
            {expanded ? 'DeepDive' : 'DD'}
          </span>
        </div>
      </div>

      <nav className="mt-1 flex flex-col gap-1 px-2">
        {items.map((it) => {
          const active = it.href === '/' ? pathname === '/' : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              title={!expanded ? it.label : undefined}
              aria-label={it.label}
              className={[
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-sky-500/40',
                active
                  ? 'bg-slate-900/60 text-slate-50 ring-1 ring-sky-500/20'
                  : 'text-slate-300 hover:bg-slate-900/40 hover:text-slate-50',
                !expanded ? 'justify-center px-2' : '',
              ].join(' ')}
            >
              <span className={active ? 'text-sky-200' : 'text-slate-300 group-hover:text-slate-50'}>{it.icon}</span>
              {expanded ? <span className="truncate">{it.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pb-4" />
    </aside>
  );
}