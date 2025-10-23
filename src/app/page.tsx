'use client';
import { useState } from 'react';
import { useVideos } from '@/hooks/useVideos';
import { SearchBar } from '@/components/SearchBar';
import { thumb } from '@/lib/videoService';

export default function HomePage() {
  const { videos, loading, searchVideos } = useVideos();
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [level, setLevel] = useState('');

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">DeepDive — MVP</h1>
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
          onSubmit={() => searchVideos(search, language, level)}
        />

        {/* Content Section */}
        {loading ? (
          <p className="text-neutral-400">Loading…</p>
        ) : videos.length === 0 ? (
          <p className="text-neutral-500 text-sm italic">No videos found. Try searching for a topic.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((v) => (
              <article
                key={v.id}
                className="bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 hover:border-neutral-600 transition-colors"
              >
                <div className="aspect-video bg-neutral-800">
                  <img
                    src={thumb(v.video_url)}
                    alt={v.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 space-y-2">
                  <h2 className="font-medium leading-snug">{v.title}</h2>
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
      </section>
    </main>
  );
}