'use client';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useVideos } from '@/hooks/useVideos';
import { SearchBar } from '@/components/SearchBar';
import { thumb } from '@/lib/videoService';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  const { videos, tracks, loading, searchVideos } = useVideos();
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [level, setLevel] = useState('');
  const [requestStatus, setRequestStatus] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);

  const trackSections = useMemo(() => {
    const t = tracks;
    return [
      { title: 'Beginner Track', track: t?.Beginner ?? null },
      { title: 'Intermediate Track', track: t?.Intermediate ?? null },
      { title: 'Advanced Track', track: t?.Advanced ?? null },
    ];
  }, [tracks]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">DeepDive</h1>
        <p className="text-sm text-neutral-400">Search learning videos by topic</p>
      </header>

      <section className="p-6 space-y-4">
        {/* Search and Filter Bar */}
        <SearchBar
          search={search}
          language={language}
          level={level}
          onSearchChange={setSearch}
          onLanguageChange={setLanguage}
          onLevelChange={setLevel}
          onSubmit={async () => {
            setRequestStatus('');
            await searchVideos(search, language, level);
          }}
        />

        {/* Content Section */}
        {loading ? (
          <p className="text-neutral-400">Loading…</p>
        ) : !search.trim() ? (
          <p className="text-neutral-500 text-sm italic">Start your search above to find learning videos.</p>
        ) : videos.length === 0 ? (
          <div className="space-y-3">
            <p className="text-neutral-500 text-sm italic">No videos found. Try another topic.</p>

            <div className="space-y-2">
              <button
                className="bg-neutral-200 text-neutral-900 rounded-lg px-3 py-2 disabled:opacity-60"
                disabled={requestBusy}
                onClick={async () => {
                  const q = search.trim();
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

                    if (accepted) {
                      setRequestStatus('Request submitted. Check back later.');
                    } else {
                      setRequestStatus('Request failed. Try again.');
                    }
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
                          <a
                            href={track.startHere.video_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block text-sm underline underline-offset-4"
                          >
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
                            <article
                              key={v.id}
                              className="bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 hover:border-neutral-600 transition-colors"
                            >
                              <div className="relative aspect-video bg-neutral-800">
                                <Image
                                  src={thumb(v.video_url)}
                                  alt={v.title}
                                  fill
                                  sizes="(max-width: 1024px) 100vw, 33vw"
                                  className="object-cover"
                                />
                              </div>
                              <div className="p-4 space-y-2">
                                <h4 className="font-medium leading-snug">{v.title}</h4>
                                <div className="text-xs text-neutral-400">
                                  <span>{v.source_channel || 'Unknown'}</span>
                                  {v.language && <span> · {v.language}</span>}
                                  {v.level && <span> · {v.level}</span>}
                                  {v.duration_min && <span> · {v.duration_min} min</span>}
                                </div>
                                <a
                                  href={v.video_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-block text-sm underline underline-offset-4"
                                >
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
      </section>

      <Footer />
    </main>
  );
}