'use client';

import { usePathname } from 'next/navigation';

function titleFromPath(path: string) {
  if (path === '/') return 'Home';
  if (path.startsWith('/search')) return 'Search';
  if (path.startsWith('/popular')) return 'Popular';
  if (path.startsWith('/settings')) return 'Settings';
  return 'DeepDive';
}

export function Topbar() {
  const pathname = usePathname();
  const title = titleFromPath(pathname);

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur px-6 py-4">
      <div className="text-sm text-neutral-300">{title}</div>
    </header>
  );
}