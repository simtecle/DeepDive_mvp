'use client';

import { useEffect, useMemo, useState } from 'react';
import { SnakeTrack } from '@/components/SnakeTrack';
import type { VideoCardVideo } from '@/components/VideoCard';
import { useRouter, useSearchParams } from 'next/navigation';
import { useVideos } from '@/hooks/useVideos';
import { SearchBar } from '@/components/SearchBar';

export default function SearchPageClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const qParam = (sp.get('q') ?? '').trim();
  const levelParam = (sp.get('level') ?? '').trim();
  const langParam = (sp.get('lang') ?? '').trim();

  const { videos, tracks, loading, searchVideos } = useVideos();
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [level, setLevel] = useState('');
  const [requestStatus, setRequestStatus] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);
  const [autoKey, setAutoKey] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearched, setLastSearched] = useState<{ q: string; language: string; level: string } | null>(null);

  const snakeTracks = useMemo(() => {
    const t = tracks;

    const toCardVideo = (v: any): VideoCardVideo => ({
      title: String(v?.title ?? ''),
      video_url: String(v?.video_url ?? ''),
      source_channel: v?.source_channel ?? null,
      duration_min: v?.duration_min ?? null,
      language: v?.language ?? null,
      level: v?.level ?? null,
    });

    const buildList = (track: any): VideoCardVideo[] => {
      if (!track) return [];
      const list: any[] = [];
      if (track.startHere) list.push(track.startHere);
      if (Array.isArray(track.items)) list.push(...track.items);
      // Filter invalid entries defensively
      return list
        .map(toCardVideo)
        .filter((x) => x.title && x.video_url);
    };

    return {
      beginner: buildList(t?.Beginner ?? null),
      intermediate: buildList(t?.Intermediate ?? null),
      advanced: buildList(t?.Advanced ?? null),
    };
  }, [tracks]);

  useEffect(() => {
    if (qParam && qParam !== search) setSearch(qParam);

    const allowedLevels = new Set(['Beginner', 'Intermediate', 'Advanced']);
    if (allowedLevels.has(levelParam) && levelParam !== level) {
      setLevel(levelParam);
    }

    if (langParam && langParam !== language) setLanguage(langParam);

    setHasSearched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam, levelParam, langParam]);

  useEffect(() => {
    const q = qParam;
    if (!q) return;

    const allowedLevels = new Set(['', 'Beginner', 'Intermediate', 'Advanced']);
    const lvl = allowedLevels.has(levelParam) ? levelParam : '';

    const key = JSON.stringify({ q, language: langParam || language, level: lvl });
    if (key === autoKey) return;

    setAutoKey(key);
    setRequestStatus('');
    setLastSearched({ q, language: langParam || language, level: lvl });
    setHasSearched(true);
    void searchVideos(q, langParam || language, lvl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam, levelParam, langParam, language]);

  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-3xl font-semibold">DeepDive</h1>
        <p className="text-sm text-slate-400">Search learning videos by topic</p>
      </header>

      <SearchBar
        search={search}
        language={language}
        level={level}
        onSearchChange={(v) => {
          setSearch(v);
          setHasSearched(false);
        }}
        onLanguageChange={(v) => {
          setLanguage(v);
          setHasSearched(false);
        }}
        onLevelChange={(v) => {
          setLevel(v);
          setHasSearched(false);
        }}
        onSubmit={async () => {
          const q = search.trim();
          if (!q) return;

          setRequestStatus('');
          setHasSearched(true);
          setLastSearched({ q, language, level });

          // Keep URL in sync so results are shareable and navigation from Popular pre-fills correctly.
          const params = new URLSearchParams();
          params.set('q', q);
          if (level) params.set('level', level);
          if (language) params.set('lang', language);

          const nextUrl = `/search?${params.toString()}`;

          // If URL already matches current params, run search directly.
          // Otherwise, update the URL and let the effect below trigger the search.
          const currentLangParam = (sp.get('lang') ?? '').trim();
          if (qParam === q && levelParam === level && currentLangParam === language) {
            await searchVideos(q, language, level);
            return;
          }

          router.replace(nextUrl);
        }}
      />

      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : !hasSearched ? (
        <p className="text-neutral-500 text-sm italic">Type a topic and press Search.</p>
      ) : videos.length === 0 ? (
        <div className="space-y-3">
          <p className="text-neutral-500 text-sm italic">No videos found. Try another topic.</p>

          <div className="space-y-2">
            <button
              className="bg-neutral-200 text-neutral-900 rounded-lg px-3 py-2 disabled:opacity-60"
              disabled={requestBusy}
              onClick={async () => {
                const q = (lastSearched?.q ?? '').trim();
                if (!q) return;

                const ok = window.confirm(`Request "${q}"?`);
                if (!ok) return;

                setRequestBusy(true);
                setRequestStatus('Submitting request…');

                try {
                  const res = await fetch('/api/request-topic', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query_raw: q }),
                  });

                  if (res.status === 429) {
                    setRequestStatus('Rate limit reached. Try again later.');
                    return;
                  }

                  const data: unknown = await res.json();
                  const accepted =
                    typeof data === 'object' &&
                    data !== null &&
                    'accepted' in data &&
                    (data as { accepted: boolean }).accepted === true;

                  setRequestStatus(accepted ? 'Request submitted. Check back later.' : 'Request failed. Try again.');
                } catch {
                  setRequestStatus('Request failed. Try again.');
                } finally {
                  setRequestBusy(false);
                }
              }}
            >
              Request this topic
            </button>

            {requestStatus && <p className="text-sm text-neutral-400">{requestStatus}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          <SnakeTrack title="Beginner Track" videos={snakeTracks.beginner} coreCount={4} morePreviewCount={6} />
          <SnakeTrack title="Intermediate Track" videos={snakeTracks.intermediate} coreCount={4} morePreviewCount={6} />
          <SnakeTrack title="Advanced Track" videos={snakeTracks.advanced} coreCount={4} morePreviewCount={6} />
        </div>
      )}
    </main>
  );
}