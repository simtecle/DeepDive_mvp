'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useVideos } from '@/hooks/useVideos';
import { SearchBar } from '@/components/SearchBar';
import { thumb } from '@/lib/videoService';

export default function SearchPageClient() {
  const sp = useSearchParams();
  const qParam = (sp.get('q') ?? '').trim();
  const levelParam = (sp.get('level') ?? '').trim();

  const { videos, tracks, loading, searchVideos } = useVideos();
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [level, setLevel] = useState('');
  const [requestStatus, setRequestStatus] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);
  const [autoKey, setAutoKey] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearched, setLastSearched] = useState<{ q: string; language: string; level: string } | null>(null);

  const trackSections = useMemo(() => {
    const t = tracks;
    return [
      { title: 'Beginner Track', track: t?.Beginner ?? null },
      { title: 'Intermediate Track', track: t?.Intermediate ?? null },
      { title: 'Advanced Track', track: t?.Advanced ?? null },
    ];
  }, [tracks]);

  useEffect(() => {
    if (qParam && qParam !== search) setSearch(qParam);

    const allowedLevels = new Set(['Beginner', 'Intermediate', 'Advanced']);
    if (allowedLevels.has(levelParam) && levelParam !== level) {
      setLevel(levelParam);
    }

    setHasSearched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam, levelParam]);

  useEffect(() => {
    const q = qParam;
    if (!q) return;

    const allowedLevels = new Set(['', 'Beginner', 'Intermediate', 'Advanced']);
    const lvl = allowedLevels.has(levelParam) ? levelParam : '';

    const key = JSON.stringify({ q, language, level: lvl });
    if (key === autoKey) return;

    setAutoKey(key);
    setRequestStatus('');
    setLastSearched({ q, language, level: lvl });
    setHasSearched(true);
    void searchVideos(q, language, lvl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam, levelParam, language]);

  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-3xl font-semibold">DeepDive</h1>
        <p className="text-sm text-neutral-400">Search learning videos by topic</p>
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
          setRequestStatus('');
          setHasSearched(true);
          setLastSearched({ q, language, level });
          await searchVideos(q, language, level);
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
          {trackSections.map(({ title, track }) => (
            <section key={title} className="space-y-4">
              <h2 className="text-lg font-semibold">{title}</h2>

              {!track || !track.startHere ? (
                <p className="text-neutral-500 text-sm italic">No videos in this track yet.</p>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-neutral-300">Start Here</h3>
                    <article className="bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800">
                      <div className="relative aspect-video bg-neutral-800">
                        <Image
                          src={thumb(track.startHere.video_url)}
                          alt={track.startHere.title}
                          fill
                          sizes="(max-width: 1024px) 100vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                      <div className="p-4 space-y-2">
                        <h4 className="font-medium leading-snug">{track.startHere.title}</h4>
                        <div className="text-xs text-neutral-400">
                          <span>{track.startHere.source_channel || 'Unknown'}</span>
                          {track.startHere.language && <span> · {track.startHere.language}</span>}
                          {track.startHere.level && <span> · {track.startHere.level}</span>}
                          {track.startHere.duration_min && <span> · {track.startHere.duration_min} min</span>}
                        </div>
                        <a href={track.startHere.video_url} target="_blank" rel="noreferrer" className="inline-block text-sm underline underline-offset-4">
                          Watch
                        </a>
                      </div>
                    </article>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-neutral-300">More in this track</h3>
                    {track.items.length === 0 ? (
                      <p className="text-neutral-500 text-sm italic">No additional videos yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {track.items.map((v) => (
                          <article key={v.id} className="bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 hover:border-neutral-600 transition-colors">
                            <div className="relative aspect-video bg-neutral-800">
                              <Image src={thumb(v.video_url)} alt={v.title} fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover" />
                            </div>
                            <div className="p-4 space-y-2">
                              <h4 className="font-medium leading-snug">{v.title}</h4>
                              <div className="text-xs text-neutral-400">
                                <span>{v.source_channel || 'Unknown'}</span>
                                {v.language && <span> · {v.language}</span>}
                                {v.level && <span> · {v.level}</span>}
                                {v.duration_min && <span> · {v.duration_min} min</span>}
                              </div>
                              <a href={v.video_url} target="_blank" rel="noreferrer" className="inline-block text-sm underline underline-offset-4">
                                Watch
                              </a>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}