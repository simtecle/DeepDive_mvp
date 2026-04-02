// src/lib/ranking.ts
import type { Video } from '@/types/video';

export type Filters = {
  search: string;
  language?: string; // '' or 'en'/'de'
  level?: string; // '' or 'Beginner'/'Intermediate'/'Advanced'
};

function norm(s: string) {
  return (s ?? '').toLowerCase().trim();
}

function containsQuery(haystack: string, q: string) {
  const h = norm(haystack);
  const qq = norm(q);
  if (!qq) return false;
  return h.includes(qq);
}

function relevanceMatch(v: Video, q: string): boolean {
  return (
    containsQuery(v.title ?? '', q) ||
    containsQuery(v.topic_name ?? '', q) ||
    containsQuery(v.subtopic_name ?? '', q) ||
    containsQuery(v.tags_text ?? '', q) ||
    containsQuery(v.tags ?? '', q)
  );
}

function durationFitBonus(level: string | null, durationMin: number | null): number {
  if (!durationMin || durationMin <= 0) return 0;

  const lvl = (level ?? '').toLowerCase();
  if (lvl === 'beginner') return durationMin >= 8 && durationMin <= 60 ? 10 : 0;
  if (lvl === 'intermediate') return durationMin >= 10 && durationMin <= 120 ? 10 : 0;
  if (lvl === 'advanced') return durationMin >= 15 && durationMin <= 180 ? 10 : 0;
  return 0;
}

function dateValue(v: Video): number {
  // Tie-breaker: published_at desc, then created_at desc
  const d1 = v.published_at ? Date.parse(v.published_at) : NaN;
  const d2 = v.created_at ? Date.parse(v.created_at) : NaN;
  const a = Number.isFinite(d1) ? d1 : 0;
  const b = Number.isFinite(d2) ? d2 : 0;
  return Math.max(a, b);
}

export function computeScore(v: Video, filters: Filters): number {
  let score = 0;

  // +50 relevance match
  if (relevanceMatch(v, filters.search)) score += 50;

  // +20 language match if filter set
  if (filters.language && v.language === filters.language) score += 20;

  // +20 level match if filter set
  if (filters.level && v.level === filters.level) score += 20;

  // +10 duration fit
  score += durationFitBonus(v.level ?? null, v.duration_min ?? null);

  return score;
}

export function sortByScore(videos: Video[], filters: Filters): Video[] {
  return [...videos].sort((a, b) => {
    const sa = computeScore(a, filters);
    const sb = computeScore(b, filters);
    if (sb !== sa) return sb - sa;

    return dateValue(b) - dateValue(a);
  });
}

export function buildTracks(videos: Video[], filters: Filters) {
  const sorted = sortByScore(videos, filters);

  const beginner = sorted.filter((v) => v.level === 'Beginner');
  const intermediate = sorted.filter((v) => v.level === 'Intermediate');
  const advanced = sorted.filter((v) => v.level === 'Advanced');
  const unknown = sorted.filter(
    (v) => !v.level || !['Beginner', 'Intermediate', 'Advanced'].includes(v.level)
  );

  return { beginner, intermediate, advanced, unknown };
}

export function pickStartHere(videos: Video[], filters: Filters): Video | null {
  if (!videos.length) return null;

  // If user set level filter: pick best within that level
  if (filters.level) {
    const inLevel = videos.filter((v) => v.level === filters.level);
    return sortByScore(inLevel, filters)[0] ?? null;
  }

  // No level filter: prefer Beginner, else Intermediate, else Advanced
  const tracks = buildTracks(videos, filters);

  if (tracks.beginner.length) return tracks.beginner[0];
  if (tracks.intermediate.length) return tracks.intermediate[0];
  if (tracks.advanced.length) return tracks.advanced[0];

  // fallback: best overall
  return sortByScore(videos, filters)[0] ?? null;
}

// Runtime export marker (helps avoid type-only export edge cases)
export const RANKING_VERSION = '1.5.0';