import { supabase } from '@/lib/supabaseClient';
import type { Video } from '@/types/video';

export type Level = 'Beginner' | 'Intermediate' | 'Advanced' | 'Unknown';

export type VideoQuery = {
  topicName: string;
  language?: string | null; // e.g. 'en', 'de'
  level?: Level | null;
  limit?: number;
};

/**
 * Fetch published + active videos for an EXACT canonical topic name.
 * IMPORTANT: This function intentionally uses eq() for topic matching.
 */
export async function fetchVideosByCanonicalTopicName({
  topicName,
  language,
  level,
  limit = 100,
}: VideoQuery): Promise<Video[]> {
  // Defensive trim.
  const canonical = (topicName ?? '').trim();
  if (!canonical) return [];

  // Base query.
  let q = supabase
    .from('videos')
    .select(
      'id, title, video_url, source_channel, language, level, duration_min, topic_name, subtopic_name, tags_text, status, is_active, created_at, published_at'
    )
    .eq('status', 'published')
    .eq('is_active', true)
    // Canonical match only (case-insensitive exact when no wildcards are present).
    .eq('topic_name', canonical)
    // Keep shorts out.
    .not('video_url', 'ilike', '%/shorts/%')
    // Avoid ultra-short junk (but allow nulls so we don't drop otherwise valid rows).
    .or('duration_min.is.null,duration_min.gte.5')
    .order('duration_min', { ascending: false })
    .limit(limit);

  if (language && language !== 'all') {
    q = q.eq('language', language);
  }

  if (level && level !== 'Unknown') {
    q = q.eq('level', level);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return (data ?? []) as unknown as Video[];
}

export function groupVideosByLevel(videos: Video[]): Record<Level, Video[]> {
  const out: Record<Level, Video[]> = {
    Beginner: [],
    Intermediate: [],
    Advanced: [],
    Unknown: [],
  };

  for (const v of videos ?? []) {
    const lvl = (v.level as Level) ?? 'Unknown';
    if (lvl === 'Beginner' || lvl === 'Intermediate' || lvl === 'Advanced' || lvl === 'Unknown') {
      out[lvl].push(v);
    } else {
      out.Unknown.push(v);
    }
  }

  return out;
}