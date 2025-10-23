import { supabase } from './supabaseClient';
import { Video } from '@/types/video';

console.log('Supabase env test:', {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ key loaded' : '❌ key missing'
});

export async function fetchVideos(search: string, language: string, level: string): Promise<Video[]> {
  let q = supabase
    .from('videos')
    .select('*')
    // .eq('is_active', true)
    // .in('status', ['queued', 'published'])
    .order('created_at', { ascending: false })
    .limit(30);

  if (language) q = q.eq('language', language);
  if (level) q = q.eq('level', level);

  if (search.trim()) {
    q = q.ilike('title', `%${search}%`);
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