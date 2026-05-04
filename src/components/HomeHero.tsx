'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Level = '' | 'Beginner' | 'Intermediate' | 'Advanced';
type Lang = '' | 'en' | 'de';

const TOPIC_CHIPS = [
  'Java programming',
  'SQL',
  'Python',
  'Linear algebra',
  'Calculus',
  'Microeconomics',
  'Greek mythology',
  'Psychology',
  'Metabolism',
  'Deep sea',
];

export function HomeHero() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<Level>('');
  const [lang, setLang] = useState<Lang>('');

  const canSubmit = useMemo(() => query.trim().length >= 2, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function goToSearch() {
    const q = query.trim();
    if (q.length < 2) return;

    const params = new URLSearchParams();
    params.set('q', q);
    if (level) params.set('level', level);
    if (lang) params.set('lang', lang);

    router.push(`/search?${params.toString()}`);
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950">
      {/* Spotlight background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px circle at 50% 30%, rgba(56,189,248,0.10), transparent 55%), radial-gradient(800px circle at 20% 20%, rgba(99,102,241,0.08), transparent 60%), radial-gradient(900px circle at 80% 70%, rgba(59,130,246,0.06), transparent 60%)',
        }}
      />

      <div className="relative flex min-h-[72vh] flex-col justify-center px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-4xl">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Turn any topic into a learning path
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-slate-300 sm:text-base">
              Search a topic and get a ranked Beginner → Advanced track. No shorts.
            </p>
          </div>

          {/* Primary Search Cluster */}
          <div className="mt-10 rounded-3xl border border-slate-800/70 bg-slate-900/40 p-4 sm:p-5 shadow-[0_0_0_1px_rgba(148,163,184,0.08)] backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="flex-1">
                <label className="sr-only" htmlFor="home-search">
                  Search topic
                </label>
                <input
                  id="home-search"
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      goToSearch();
                    }
                  }}
                  placeholder="Search a topic (e.g. Java, SQL, Calculus)"
                  className="w-full rounded-2xl border border-slate-800/70 bg-slate-950 px-5 py-4 text-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/40"
                />
              </div>

              <button
                type="button"
                onClick={goToSearch}
                disabled={!canSubmit}
                className="rounded-2xl bg-sky-500/90 px-6 py-4 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Generate learning path
              </button>
            </div>

            {/* Secondary controls */}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as Level)}
                  className="rounded-xl border border-slate-800/70 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/40"
                  aria-label="Level"
                >
                  <option value="">Any level</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>

                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Lang)}
                  className="rounded-xl border border-slate-800/70 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/40"
                  aria-label="Language"
                >
                  <option value="">Any language</option>
                  <option value="en">English</option>
                  <option value="de">German</option>
                </select>
              </div>

              <p className="text-xs text-slate-500">
                No results? You can request a topic on the Search page.
              </p>
            </div>

            {/* Quiet chips */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-slate-500">Try:</span>
              {TOPIC_CHIPS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setQuery(t);
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                  className="rounded-full border border-slate-800/70 bg-slate-950/50 px-3 py-1 text-xs text-slate-300 hover:bg-slate-900 hover:text-slate-100 hover:border-sky-500/30"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Compact how-it-works row */}
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
              <div className="text-sm font-medium">Search a topic</div>
              <div className="mt-1 text-xs text-slate-400">Broad or specific. Your choice.</div>
            </div>
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
              <div className="text-sm font-medium">Get a ranked track</div>
              <div className="mt-1 text-xs text-slate-400">Start Here + next steps.</div>
            </div>
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
              <div className="text-sm font-medium">Learn in order</div>
              <div className="mt-1 text-xs text-slate-400">Shorts filtered. Quality prioritized.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}