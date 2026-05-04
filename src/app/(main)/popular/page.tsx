'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type PopularTopic = {
  topic: string;
  publishedCount: number;
};

export default function PopularPage() {
  const [topics, setTopics] = useState<PopularTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Add a timestamp to avoid any caching issues in browsers/CDNs.
        const res = await fetch(`/api/top-topics?ts=${Date.now()}`);

        const contentType = res.headers.get('content-type') ?? '';
        const raw = await res.text();
        const json: unknown = contentType.includes('application/json')
          ? (() => {
              try {
                return JSON.parse(raw) as unknown;
              } catch {
                return undefined;
              }
            })()
          : undefined;

        if (!res.ok) {
          const msg =
            json && typeof json === 'object' && 'error' in (json as Record<string, unknown>)
              ? String((json as Record<string, unknown>).error ?? 'Failed to load top topics')
              : `Failed to load top topics (HTTP ${res.status})`;
          throw new Error(msg);
        }

        const items = (() => {
          if (typeof json !== 'object' || json === null) return undefined;
          const obj = json as Record<string, unknown>;
          const cand =
            obj.topics ??
            obj.items ??
            obj.data ??
            obj.results ??
            (obj.topics as unknown);
          return Array.isArray(cand) ? (cand as unknown[]) : undefined;
        })();

        if (!items) throw new Error('Invalid response from /api/top-topics');

        // Normalize item shape defensively.
        const normalized: PopularTopic[] = items
          .map((it) => {
            if (typeof it !== 'object' || it === null) return null;
            const rec = it as Record<string, unknown>;
            const topic = String(rec.topic ?? rec.topic_name ?? rec.name ?? '');
            const publishedCount = Number(rec.publishedCount ?? rec.published_count ?? rec.count ?? 0);
            if (!topic) return null;
            return { topic, publishedCount };
          })
          .filter((x): x is PopularTopic => Boolean(x));

        if (!cancelled) setTopics(normalized);
        return;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Popular topics</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Topics with the most published videos in the library.
        </p>
      </header>

      {loading && <p className="text-sm text-neutral-400">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && topics.length === 0 && (
        <p className="text-sm text-neutral-400">No popular topics yet.</p>
      )}

      {!loading && !error && topics.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => (
            <li
              key={t.topic}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{t.topic}</div>
                  <div className="text-xs text-neutral-400 mt-1">
                    {t.publishedCount} published
                  </div>
                </div>

                <Link
                  className="text-sm underline underline-offset-4 hover:text-neutral-200"
                  href={`/search?q=${encodeURIComponent(t.topic)}`}
                >
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}