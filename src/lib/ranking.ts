// src/lib/ranking.ts
import type { Video } from '@/types/video';

// -----------------------------
// Backwards compatible Filters
// -----------------------------
export type Filters = {
  search: string;
  language?: string; // '' or 'en'/'de'
  level?: string; // '' or 'Beginner'/'Intermediate'/'Advanced'
};

export type Level = 'Beginner' | 'Intermediate' | 'Advanced';

export type Track = {
  startHere: Video | null;
  items: Video[]; // additional items after startHere
};

export type TracksByLevel = Record<Level, Track>;

const COURSE_KEYWORDS = [
  'full course',
  'course',
  'tutorial',
  'lesson',
  'lectures',
  'chapter',
  'sections',
  'beginner',
  'fundamentals',
  'crash course',
  'project',
  'exercise',
  'bootcamp',
];

function norm(s: string) {
  return (s ?? '').toLowerCase().trim();
}


function tagsToText(v: Video): string {
  // Support both tags_text (comma string) and tags (string[])
  const t1 = typeof v.tags_text === 'string' ? v.tags_text : '';
  const t2 = Array.isArray(v.tags) ? v.tags.join(',') : '';
  return `${t1},${t2}`;
}

export function isShortCandidate(v: Video): boolean {
  const url = norm(v.video_url ?? '');
  if (url.includes('/shorts/')) return true;
  const d = v.duration_min ?? 0;
  // User requirement: exclude very short videos
  if (d > 0 && d < 5) return true;
  return false;
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 8);
}

function relevanceScore(v: Video, query: string): number {
  const tokens = tokenize(query);
  const blob = [v.title, v.topic_name, v.subtopic_name, v.tags_text, tagsToText(v)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let score = 0;
  for (const t of tokens) {
    if (blob.includes(t)) score += 1;
  }

  // Boost if topic_name matches first token
  const t0 = tokens[0] ?? '';
  if (t0 && (v.topic_name ?? '').toLowerCase().includes(t0)) score += 2;

  return score;
}

function durationScore(v: Video, isStartHere: boolean): number {
  const d = v.duration_min ?? 0;
  if (d <= 0) return 0;

  if (isStartHere) {
    // User preference: start here >= 20 minutes
    const min = 20;
    const max = 240;
    if (d >= min && d <= max) return 3;
    if (d >= 5 && d < min) return 1;
    if (d > max && d <= 480) return 1;
    return 0;
  }

  // Track items can be broader
  if (d >= 8 && d <= 300) return 2;
  if (d > 300 && d <= 600) return 1;
  return 0;
}

function hasCourseSignals(v: Video): boolean {
  const text = `${v.title ?? ''} ${v.description ?? ''}`.toLowerCase();
  return COURSE_KEYWORDS.some((k) => text.includes(k));
}

function qualityScore(v: Video): number {
  let score = 0;

  const conf = typeof v.confidence === 'number' ? v.confidence : 0;
  score += conf * 5;

  if (hasCourseSignals(v)) score += 1.5;

  // Optional weak popularity signal
  const views = Number(v.view_count ?? '0');
  if (Number.isFinite(views) && views > 0) {
    score += Math.min(1.0, Math.log10(views) / 10);
  }

  return score;
}

function combinedScore(v: Video, query: string, isStartHere: boolean): number {
  return relevanceScore(v, query) * 2 + durationScore(v, isStartHere) + qualityScore(v);
}

function tagSetFrom(v: Video): Set<string> {
  const tags = tagsToText(v)
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return new Set(tags);
}

function tagGain(base: Set<string>, v: Video): number {
  const t = tagSetFrom(v);
  let gain = 0;
  for (const x of t) if (!base.has(x)) gain++;
  return gain;
}

function dateValue(v: Video): number {
  const d1 = v.published_at ? Date.parse(v.published_at) : NaN;
  const d2 = v.created_at ? Date.parse(v.created_at) : NaN;
  const a = Number.isFinite(d1) ? d1 : 0;
  const b = Number.isFinite(d2) ? d2 : 0;
  return Math.max(a, b);
}

// -----------------------------
// Phase 2.35: Track building
// -----------------------------
export function buildTrackForLevel(all: Video[], query: string, level: Level): Track {
  const candidates = all
    .filter((v) => !isShortCandidate(v))
    .filter((v) => v.status === 'published' && v.is_active === true)
    .filter((v) => (v.level ?? '') === level);

  if (candidates.length === 0) return { startHere: null, items: [] };

  const sortedForStart = [...candidates].sort((a, b) => {
    const sa = combinedScore(a, query, true);
    const sb = combinedScore(b, query, true);
    if (sb !== sa) return sb - sa;
    return dateValue(b) - dateValue(a);
  });

  const startHere = sortedForStart[0] ?? null;
  if (!startHere) return { startHere: null, items: [] };

  // Diversity selection: must add new tags; cap per channel
  const baseTags = tagSetFrom(startHere);
  const channelCount = new Map<string, number>();
  const ch0 = norm(startHere.source_channel ?? 'unknown');
  channelCount.set(ch0, 1);

  const rest = sortedForStart
    .slice(1)
    .sort((a, b) => {
      const sa = combinedScore(a, query, false);
      const sb = combinedScore(b, query, false);
      if (sb !== sa) return sb - sa;
      return dateValue(b) - dateValue(a);
    });

  const picked: Video[] = [];
  for (const v of rest) {
    if (picked.length >= 6) break; // Start Here + 6

    const ch = norm(v.source_channel ?? 'unknown');
    const used = channelCount.get(ch) ?? 0;
    if (used >= 2) continue;

    const gain = tagGain(baseTags, v);
    if (gain <= 0) continue;

    picked.push(v);
    channelCount.set(ch, used + 1);

    for (const t of tagSetFrom(v)) baseTags.add(t);
  }

  return { startHere, items: picked };
}

export function buildTracksByLevel(all: Video[], query: string): TracksByLevel {
  return {
    Beginner: buildTrackForLevel(all, query, 'Beginner'),
    Intermediate: buildTrackForLevel(all, query, 'Intermediate'),
    Advanced: buildTrackForLevel(all, query, 'Advanced'),
  };
}

// -----------------------------
// Backwards-compatible exports
// (keep existing UI working)
// -----------------------------
export function computeScore(v: Video, filters: Filters): number {
  // Preserve prior signature but use the new combined score.
  // Treat as "not startHere" scoring.
  const base = combinedScore(v, filters.search, false);

  // Optional filter boosts remain
  let score = base;
  if (filters.language && v.language === filters.language) score += 2;
  if (filters.level && v.level === filters.level) score += 2;

  return score;
}

export function sortByScore(videos: Video[], filters: Filters): Video[] {
  return [...videos]
    .filter((v) => !isShortCandidate(v))
    .sort((a, b) => {
      const sa = computeScore(a, filters);
      const sb = computeScore(b, filters);
      if (sb !== sa) return sb - sa;
      return dateValue(b) - dateValue(a);
    });
}

export function buildTracks(videos: Video[], filters: Filters) {
  // Old return shape: arrays by level. Now also filters shorts.
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

  return sortByScore(videos, filters)[0] ?? null;
}

export const RANKING_VERSION = '2.35.0';