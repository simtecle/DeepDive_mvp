'use client';

import { useEffect, useState } from 'react';
import { SnakeTrack } from '@/components/SnakeTrack';
import { useRouter, useSearchParams } from 'next/navigation';
import { useVideos } from '@/hooks/useVideos';
import { SearchBar } from '@/components/SearchBar';

type ResolveTopicResponse =
  | { ok: true; topic_name: string; topic_key: string; match_type: string; score: number }
  | { ok: false; reason?: string; error?: string };

type TopicSuggestion = { topic_name: string; published_count: number };

type TopTopicsResponse =
  | { ok: true; topics: TopicSuggestion[] }
  | { ok: false; error?: string };

function normalizeForMatch(s: string) {
  return (s ?? '').trim().toLowerCase();
}

function sortSuggestions(query: string, list: TopicSuggestion[]) {
  const q = normalizeForMatch(query);
  const scored = (list ?? []).map((s) => {
    const name = normalizeForMatch(s.topic_name);
    const starts = q && name.startsWith(q) ? 0 : 1;
    const contains = q && name.includes(q) ? 0 : 1;
    return { s, starts, contains };
  });
  scored.sort((a, b) => {
    if (a.starts !== b.starts) return a.starts - b.starts;
    if (a.contains !== b.contains) return a.contains - b.contains;
    if ((b.s.published_count ?? 0) !== (a.s.published_count ?? 0)) return (b.s.published_count ?? 0) - (a.s.published_count ?? 0);
    return a.s.topic_name.localeCompare(b.s.topic_name);
  });
  return scored.map((x) => x.s);
}

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
  const [noCanonicalMatch, setNoCanonicalMatch] = useState(false);

  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [suggestBusy, setSuggestBusy] = useState(false);

  useEffect(() => {
    if (qParam && qParam !== search) setSearch(qParam);

    const allowedLevels = new Set(['Beginner', 'Intermediate', 'Advanced']);
    if (allowedLevels.has(levelParam) && levelParam !== level) {
      setLevel(levelParam);
    }

    if (langParam && langParam !== language) setLanguage(langParam);

    setHasSearched(false);
    setNoCanonicalMatch(false);
    setSuggestions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam, levelParam, langParam]);

  async function resolveAndSearch(rawInput: string, lang: string, lvl: string, opts?: { syncUrl?: boolean }) {
    const raw = (rawInput ?? '').trim();
    if (!raw) return;

    setRequestStatus('');
    setNoCanonicalMatch(false);
    setSuggestions([]);

    // Resolve canonical topic first to avoid mixed/approximate matches.
    let resolvedName = '';
    try {
      const res = await fetch(`/api/resolve-topic?q=${encodeURIComponent(raw)}`);
      const data = (await res.json()) as ResolveTopicResponse;
      if (res.ok && data && 'ok' in data && data.ok) {
        resolvedName = data.topic_name;
      }
    } catch {
      // ignore
    }

    setHasSearched(true);
    setLastSearched({ q: raw, language: lang, level: lvl });

    if (!resolvedName) {
      setNoCanonicalMatch(true);
      return;
    }

    // Optionally keep URL in sync (shareable). Use canonical topic name in the URL.
    if (opts?.syncUrl) {
      const params = new URLSearchParams();
      params.set('q', resolvedName);
      if (lvl) params.set('level', lvl);
      if (lang) params.set('lang', lang);
      const nextUrl = `/search?${params.toString()}`;

      // Avoid triggering a pointless navigation loop.
      const currentLangParam = (sp.get('lang') ?? '').trim();
      if (qParam !== resolvedName || levelParam !== lvl || currentLangParam !== lang) {
        router.replace(nextUrl);
      }
    }

    await searchVideos(resolvedName, lang, lvl);
  }

  useEffect(() => {
    const q = qParam;
    if (!q) return;

    const allowedLevels = new Set(['', 'Beginner', 'Intermediate', 'Advanced']);
    const lvl = allowedLevels.has(levelParam) ? levelParam : '';

    const key = JSON.stringify({ q, language: langParam || language, level: lvl });
    if (key === autoKey) return;

    const run = async () => {
      setAutoKey(key);
      const raw = q;
      const lang = langParam || language;
      await resolveAndSearch(raw, lang, lvl, { syncUrl: false });
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam, levelParam, langParam, language]);

  // When we have no canonical match (or no videos after a search), fetch "Did you mean" suggestions.
  useEffect(() => {
    const q = (lastSearched?.q ?? '').trim();
    if (!hasSearched) return;
    if (!q) return;

    const shouldSuggest = noCanonicalMatch || (!loading && videos.length === 0);
    if (!shouldSuggest) return;

    const run = async () => {
      setSuggestBusy(true);
      try {
        const res = await fetch(`/api/top-topics?q=${encodeURIComponent(q)}&limit=6`);
        const data = (await res.json()) as TopTopicsResponse;
        if (res.ok && data && 'ok' in data && data.ok) {
          const list = Array.isArray(data.topics) ? data.topics : [];
          setSuggestions(sortSuggestions(q, list));
          // If no close matches by substring, fall back to popular topics.
          if (list.length === 0) {
            const res2 = await fetch(`/api/top-topics?limit=6`);
            const data2 = (await res2.json()) as TopTopicsResponse;
            if (res2.ok && data2 && 'ok' in data2 && data2.ok) {
              setSuggestions(sortSuggestions(q, Array.isArray(data2.topics) ? data2.topics : []));
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setSuggestBusy(false);
      }
    };

    void run();
  }, [hasSearched, noCanonicalMatch, loading, videos.length, lastSearched]);

  function goToTopic(t: string) {
    const next = (t ?? '').trim();
    if (!next) return;

    // Keep local input in sync immediately.
    setSearch(next);

    const params = new URLSearchParams();
    params.set('q', next);
    if (level) params.set('level', level);
    if (language) params.set('lang', language);
    router.replace(`/search?${params.toString()}`);

    // Trigger search immediately so the click feels responsive.
    void resolveAndSearch(next, language, level, { syncUrl: false });
  }

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
          const raw = search.trim();
          if (!raw) return;

          // Run search first; also sync URL to canonical topic.
          await resolveAndSearch(raw, language, level, { syncUrl: true });
        }}
      />

      {loading ? (
        <p className="text-neutral-400">Loading…</p>
      ) : !hasSearched ? (
        <p className="text-neutral-500 text-sm italic">Type a topic and press Search.</p>
      ) : noCanonicalMatch || videos.length === 0 ? (
        <div className="space-y-4">
          <p className="text-neutral-500 text-sm italic">No matching topic found. Try a more specific topic name.</p>

          {(suggestBusy || suggestions.length > 0) && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-200">Did you mean:</div>
              {suggestBusy ? (
                <p className="text-sm text-slate-400">Looking for similar topics…</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s.topic_name}
                      type="button"
                      onClick={() => goToTopic(s.topic_name)}
                      className="rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1 text-xs text-slate-200 hover:bg-slate-900 hover:border-sky-500/30"
                      title={`${s.published_count} videos`}
                    >
                      {s.topic_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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
          <SnakeTrack title="Beginner Track" videos={tracks?.Beginner?.items ?? []} coreCount={4} morePreviewCount={6} />
          <SnakeTrack title="Intermediate Track" videos={tracks?.Intermediate?.items ?? []} coreCount={4} morePreviewCount={6} />
          <SnakeTrack title="Advanced Track" videos={tracks?.Advanced?.items ?? []} coreCount={4} morePreviewCount={6} />
        </div>
      )}
    </main>
  );
}