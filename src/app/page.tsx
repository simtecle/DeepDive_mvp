'use client';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useVideos } from '@/hooks/useVideos';
import { SearchBar } from '@/components/SearchBar';
import { thumb } from '@/lib/videoService';
import { buildTracks, pickStartHere, type Filters } from '@/lib/ranking';
import type { Video } from '@/types/video';

export default function HomePage() {
  const { videos, loading, searchVideos } = useVideos();
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [level, setLevel] = useState('');

  const filters = useMemo<Filters>(() => ({ search, language, level }), [search, language, level]);

  const startHere = useMemo(() => {
    if (!search.trim() || videos.length === 0) return null;
    return pickStartHere(videos as Video[], filters);
  }, [videos, filters, search]);

  const tracks = useMemo(() => {
    if (!search.trim() || videos.length === 0) {
      return { beginner: [], intermediate: [], advanced: [], unknown: [] };
    }
    return buildTracks(videos as Video[], filters);
  }, [videos, filters, search]);

  const trackSections = useMemo(
    () => [
      { title: 'Beginner Track', list: tracks.beginner },
      { title: 'Intermediate Track', list: tracks.intermediate },
      { title: 'Advanced Track', list: tracks.advanced },
    ],
    [tracks]
  );

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
            await searchVideos(search, language, level);
          }}
        />

        {/* Content Section */}
        {loading ? (
          <p className="text-neutral-400">Loading…</p>
        ) : !search.trim() ? (
          <p className="text-neutral-500 text-sm italic">Start your search above to find learning videos.</p>
        ) : videos.length === 0 ? (
          <p className="text-neutral-500 text-sm italic">No videos found. Try another topic.</p>
        ) : (
          <div className="space-y-10">
            {startHere && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Start Here</h2>
                <article className="bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800">
                  <div className="relative aspect-video bg-neutral-800">
                    <Image
                      src={thumb(startHere.video_url)}
                      alt={startHere.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-medium leading-snug">{startHere.title}</h3>
                    <div className="text-xs text-neutral-400">
                      <span>{startHere.source_channel || 'Unknown'}</span>
                      {startHere.language && <span> · {startHere.language}</span>}
                      {startHere.level && <span> · {startHere.level}</span>}
                      {startHere.duration_min && <span> · {startHere.duration_min} min</span>}
                    </div>
                    <a
                      href={startHere.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-sm underline underline-offset-4"
                    >
                      Watch
                    </a>
                  </div>
                </article>
              </section>
            )}

            <section className="space-y-8">
              {trackSections.map(({ title, list }) => (
                <div key={title} className="space-y-3">
                  <h2 className="text-lg font-semibold">{title}</h2>
                  {list.length === 0 ? (
                    <p className="text-neutral-500 text-sm italic">No videos in this track.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {list.map((v) => (
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
                            <h3 className="font-medium leading-snug">{v.title}</h3>
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
              ))}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}