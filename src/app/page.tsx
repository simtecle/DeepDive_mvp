'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Video = {
  id: string;
  title: string;
  video_url: string;
  source_channel: string | null;
  language: string | null;
  level: string | null;
  duration_min: number | null;
  topic_name: string | null;
  subtopic_name: string | null;
  tags: string[] | null;
  status: string | null;
  is_active: boolean;
  created_at: string;
};

function youTubeIdFromUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
    const v = u.searchParams.get('v');
    return v ?? null;
  } catch {
    return null;
  }
}

function thumb(url: string) {
  const id = youTubeIdFromUrl(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
}

export default function HomePage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);

  // Search + filters
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [level, setLevel] = useState('');

  async function load() {
    if (!search.trim()) {
      setVideos([]);
      return;
    }

    setLoading(true);
    console.log('searching for:', search);

    let q = supabase
      .from('videos')
      .select('*')
      .eq('is_active', true)
      .in('status', ['queued', 'published'])
      .order('created_at', { ascending: false })
      .limit(30);

    // Filters
    if (language) q = q.eq('language', language);
    if (level) q = q.eq('level', level);

    // 🔍 Flexible Suche (Titel, Topic, Subtopic, Tags-Text, Tags-Array)
   // 🔍 Robust search fallback
  q = q.textSearch('title', search, { type: 'plain' })
     .textSearch('topic_name', search, { type: 'plain' })
     .textSearch('subtopic_name', search, { type: 'plain' })
     .textSearch('tags_text', search, { type: 'plain' });

    console.log('final query object:', q);

    const { data, error } = await q;

    if (error) {
      console.error('Supabase query error:', error.message);
      setVideos([]);
    } else {
      setVideos(data || []);
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="px-6 py-4 border-b border-neutral-800">
        <h1 className="text-2xl font-semibold">DeepDive — MVP</h1>
        <p className="text-sm text-neutral-400">
          Search learning videos by topic
        </p>
      </header>

      <section className="p-6 space-y-4">
        {/* Search bar */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 flex-1 min-w-[250px]"
            placeholder="Search topic (e.g. Java, AI, Philosophy)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="">All languages</option>
            <option value="en">English</option>
            <option value="de">German</option>
          </select>

          <select
            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="">All levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          <button
            className="bg-neutral-200 text-neutral-900 rounded-lg px-3 py-2"
            onClick={load}
          >
            Search
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <p className="text-neutral-400">Loading…</p>
        ) : videos.length === 0 ? (
          <p className="text-neutral-500 text-sm italic">
            No videos found. Try searching for a topic.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((v) => (
              <article
                key={v.id}
                className="bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 hover:border-neutral-600 transition-colors"
              >
                <div className="aspect-video bg-neutral-800">
                  {thumb(v.video_url) && (
                    <img
                      src={thumb(v.video_url)}
                      alt={v.title}
                      className="w-full h-full object-cover"
                    />
                  )}
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
