import { supabase } from './supabaseClient';
import { Video } from '@/types/video';

export async function fetchVideos(search: string, language: string, level: string): Promise<Video[]> {
  let q = supabase
    .from('videos')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'published')
    // Hard filters for Ranking v1
    .gte('duration_min', 5)
    .not('video_url', 'ilike', '%/shorts/%')
    .order('created_at', { ascending: false })
    .limit(200);

  if (language) q = q.eq('language', language);
  if (level) q = q.eq('level', level);

  const s = search.trim();
  if (s) {
    // Avoid commas/percent which can break the PostgREST `or` filter string
    const safe = s.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();

    q = q.or(
      `title.ilike.%${safe}%,topic_name.ilike.%${safe}%,subtopic_name.ilike.%${safe}%,tags_text.ilike.%${safe}%`
    );
  }

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// --- Hilfsfunktion: YouTube Thumbnail URL generieren ---
export function youTubeIdFromUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
    const v = u.searchParams.get('v');
    return v ?? null;
  } catch {
    return null;
  }
}

export function thumb(url: string) {
  const id = youTubeIdFromUrl(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
}