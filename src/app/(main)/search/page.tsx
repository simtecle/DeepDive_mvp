import { Suspense } from 'react';
import SearchPageClient from './SearchPageClient';

export const dynamic = 'force-dynamic';

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-neutral-400">Loading…</div>}>
      <SearchPageClient />
    </Suspense>
  );
}