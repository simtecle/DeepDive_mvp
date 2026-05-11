import { useState } from 'react';
import type { Video } from '@/types/video';
import { supabase } from '@/lib/supabaseClient';
import { fetchVideosByCanonicalTopicName } from '@/lib/videoService';
import { buildTracksByLevel } from '@/lib/ranking';
import type { TracksByLevel } from '@/lib/ranking';

export function useVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<TracksByLevel | null>(null);

  async function searchVideos(search: string, language: string, level: string) {
    setLoading(true);
    try {
      const canonical = (search ?? '').trim();

      let results = await fetchVideosByCanonicalTopicName({
        topicName: canonical,
        language: language === 'all' ? null : language,
        level: level === 'all' ? null : (level as any),
        limit: 100,
      });

      // Fallback: if the canonical fetch returns 0, try a case-insensitive exact match.
      // This avoids breaking when DB casing differs (e.g., "Java Programming" vs "Java programming").
      if ((results?.length ?? 0) === 0 && canonical) {
        let q = supabase
          .from('videos')
          .select('id, title, source_channel, video_url, language, duration_min, level, topic_name, status, is_active')
          .eq('status', 'published')
          .eq('is_active', true)
          // case-insensitive exact (no wildcards)
          .ilike('topic_name', canonical)
          // Keep shorts out.
          .not('video_url', 'ilike', '%/shorts/%')
          // Avoid ultra-short junk.
          .gte('duration_min', 5)
          .order('duration_min', { ascending: false })
          .limit(100);

        if (language && language !== 'all') {
          q = q.eq('language', language);
        }

        if (level && level !== 'all') {
          q = q.eq('level', level);
        }

        const { data, error } = await q;
        if (!error && data) {
          results = data as unknown as Video[];
        }
      }

      setVideos(results);
      const nextTracks = buildTracksByLevel(results, canonical);
      setTracks(nextTracks);
    } catch (e) {
      console.error('[DBG useVideos] Error loading videos:', e);
      setVideos([]);
      setTracks(null);
    }
    setLoading(false);
  }

  return { videos, tracks, loading, searchVideos };
}