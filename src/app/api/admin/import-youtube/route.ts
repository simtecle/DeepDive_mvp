import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type ImportBody = {
  query: string;
  maxResults?: number;
  language?: string; // e.g. 'en'
};

type YtSearchItem = {
  id?: { videoId?: string };
};

type YtVideosItem = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
    defaultAudioLanguage?: string;
  };
  contentDetails?: {
    duration?: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
};

type YtSearchResponse = { items?: YtSearchItem[] };
type YtVideosResponse = { items?: YtVideosItem[] };

function requireAdmin(req: NextRequest) {
  const token = req.headers.get('x-admin-token');
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(expected && token === expected);
}

function parseIsoDurationToMinutes(iso: string): number | null {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const hours = m[1] ? Number(m[1]) : 0;
  const mins = m[2] ? Number(m[2]) : 0;
  const secs = m[3] ? Number(m[3]) : 0;
  const total = hours * 60 + mins + (secs > 0 ? 1 : 0);
  return Number.isFinite(total) && total > 0 ? total : null;
}

function numericStringOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s) return null;
  return /^\d+$/.test(s) ? s : null;
}

export async function POST(req: NextRequest) {
  try {
    if (!requireAdmin(req)) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as ImportBody;
    const query = (body.query ?? '').trim();
    const maxResults = Math.min(Math.max(body.maxResults ?? 10, 1), 50);

    const languageRaw = (body.language ?? '').trim();
    const language = /^[a-z]{2}(-[A-Z]{2})?$/.test(languageRaw) ? languageRaw : undefined;

    if (!query) {
      return NextResponse.json({ ok: false, error: 'missing query' }, { status: 400 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'missing YOUTUBE_API_KEY' }, { status: 500 });
    }

    // 1) search.list -> videoIds
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('maxResults', String(maxResults));
    searchUrl.searchParams.set('key', apiKey);
    if (language) searchUrl.searchParams.set('relevanceLanguage', language);

    const searchRes = await fetch(searchUrl.toString());
    if (!searchRes.ok) {
      const text = await searchRes.text();
      return NextResponse.json({ ok: false, error: 'youtube_search_failed', details: text }, { status: 502 });
    }

    const searchJson = (await searchRes.json()) as YtSearchResponse;
    const videoIds = (searchJson.items ?? [])
      .map((it) => it.id?.videoId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    if (videoIds.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0, attempted: 0, note: 'no results' });
    }

    // 2) videos.list -> details including duration
    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    videosUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
    videosUrl.searchParams.set('id', videoIds.join(','));
    videosUrl.searchParams.set('key', apiKey);

    const videosRes = await fetch(videosUrl.toString());
    if (!videosRes.ok) {
      const text = await videosRes.text();
      return NextResponse.json({ ok: false, error: 'youtube_videos_failed', details: text }, { status: 502 });
    }

    const videosJson = (await videosRes.json()) as YtVideosResponse;

    const rows = (videosJson.items ?? [])
      .map((v) => {
        const id = v.id ?? '';
        const title = v.snippet?.title ?? '';
        const description = v.snippet?.description ?? null;
        const channelTitle = v.snippet?.channelTitle ?? null;
        const publishedAt = v.snippet?.publishedAt ?? null;
        const defaultAudioLanguage = v.snippet?.defaultAudioLanguage ?? null;
        const durationIso = v.contentDetails?.duration ?? '';
        const duration_min = parseIsoDurationToMinutes(durationIso);

        const view_count = numericStringOrNull(v.statistics?.viewCount);
        const like_count = numericStringOrNull(v.statistics?.likeCount);
        const comment_count = numericStringOrNull(v.statistics?.commentCount);

        const video_url = id ? `https://www.youtube.com/watch?v=${id}` : null;

        return {
          yt_video_id: id || null,
          title,
          description,
          source_channel: channelTitle,
          video_url,
          language: defaultAudioLanguage ?? language ?? 'en',
          duration_min,
          view_count,
          like_count,
          comment_count,
          status: 'queued',
          is_active: false,
          published_at: publishedAt,
        };
      })
      .filter((r) => typeof r.video_url === 'string' && r.video_url);

    const { data, error } = await supabaseServer
      .from('videos')
      // On conflict, update the existing row with the new metadata (description + stats)
      .upsert(rows, { onConflict: 'video_url' })
      .select('id');

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      inserted: data?.length ?? 0,
      attempted: rows.length,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}