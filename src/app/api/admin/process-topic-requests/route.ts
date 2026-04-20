import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { classifyQueued } from '@/lib/admin/classifier';

type Body = {
  maxTopics?: unknown;
  lookback?: unknown;
  maxPerQuery?: unknown;
  language?: unknown;
  classifyLimit?: unknown;
  mode?: unknown; // 'full' | 'import_only' | 'classify_only'
  queueCeiling?: unknown; // import stops when queued > ceiling
};

type Mode = 'full' | 'import_only' | 'classify_only';

type TopicRequestRow = {
  id: string;
  query_raw: string;
  query_norm: string;
  normalized_intent: string | null;
  request_count: number;
  last_requested_at: string;
  status: string;
};

function isAuthed(req: NextRequest): boolean {
  const token = req.headers.get('x-admin-token');
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(token && expected && token === expected);
}

function normIntent(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, ' ')
    .slice(0, 60);
}

function levenshtein(a: string, b: string): number {
  // Classic DP implementation, small strings only (we use it only for <=5 chars)
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

type YtSearchItem = { id?: { videoId?: string } };
type YtSearchResp = { items?: YtSearchItem[] };

type YtVideosItem = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
    defaultAudioLanguage?: string;
  };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
};
type YtVideosResp = { items?: YtVideosItem[] };

function parseIsoDurationToMinutes(iso: string): number | null {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return null;
  const h = m[1] ? Number(m[1]) : 0;
  const min = m[2] ? Number(m[2]) : 0;
  const s = m[3] ? Number(m[3]) : 0;
  const total = h * 60 + min + (s > 0 ? 1 : 0);
  return Number.isFinite(total) && total > 0 ? total : null;
}

function numericStringOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return /^\d+$/.test(s) ? s : null;
}

function validLang(x: unknown): string | undefined {
  if (typeof x !== 'string') return undefined;
  const s = x.trim();
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(s) ? s : undefined;
}

async function importYouTubeCandidates(args: { query: string; maxResults: number; language?: string }) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('missing YOUTUBE_API_KEY');

  const maxResults = Math.max(1, Math.min(50, args.maxResults));

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('q', args.query);
  searchUrl.searchParams.set('maxResults', String(maxResults));
  searchUrl.searchParams.set('key', apiKey);
  if (args.language) searchUrl.searchParams.set('relevanceLanguage', args.language);

  const sRes = await fetch(searchUrl.toString());
  if (!sRes.ok) throw new Error(`youtube_search_error:${await sRes.text()}`);
  const sJson = (await sRes.json()) as YtSearchResp;

  const ids = (sJson.items ?? [])
    .map((i) => i.id?.videoId)
    .filter((x): x is string => Boolean(x));

  if (ids.length === 0) return { attempted: 0, inserted: 0 };

  const vidsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  vidsUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
  vidsUrl.searchParams.set('id', ids.join(','));
  vidsUrl.searchParams.set('key', apiKey);

  const vRes = await fetch(vidsUrl.toString());
  if (!vRes.ok) throw new Error(`youtube_videos_error:${await vRes.text()}`);
  const vJson = (await vRes.json()) as YtVideosResp;

  const rows = (vJson.items ?? []).map((v) => {
    const yt_video_id = v.id ?? null;
    const title = v.snippet?.title ?? '';
    const description = v.snippet?.description ?? null;
    const source_channel = v.snippet?.channelTitle ?? null;
    const published_at = v.snippet?.publishedAt ?? null;
    const defaultAudioLanguage = v.snippet?.defaultAudioLanguage ?? null;
    const language = defaultAudioLanguage ?? args.language ?? 'en';
    const duration_min = parseIsoDurationToMinutes(v.contentDetails?.duration ?? '') ?? null;

    const view_count = numericStringOrNull(v.statistics?.viewCount);
    const like_count = numericStringOrNull(v.statistics?.likeCount);
    const comment_count = numericStringOrNull(v.statistics?.commentCount);

    const video_url = yt_video_id ? `https://www.youtube.com/watch?v=${yt_video_id}` : '';

    return {
      yt_video_id,
      title,
      description,
      source_channel,
      video_url,
      language,
      duration_min,
      view_count,
      like_count,
      comment_count,
      status: 'queued',
      is_active: false,
      published_at,
    };
  });

  // IMPORTANT: ignoreDuplicates so we don't overwrite existing published rows
  const { data, error } = await supabaseServer
    .from('videos')
    .upsert(rows, { onConflict: 'video_url', ignoreDuplicates: true })
    .select('id');

  if (error) throw new Error(`db_upsert_error:${error.message}`);

  return { attempted: rows.length, inserted: (data ?? []).length };
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;

  const modeRaw = typeof body.mode === 'string' ? body.mode : 'full';
  const mode: Mode =
    modeRaw === 'import_only' || modeRaw === 'classify_only' ? modeRaw : 'full';

  const maxTopics = Math.max(1, Math.min(20, Number(body.maxTopics ?? 5) || 5));
  // lookback is how many "new" requests we fetch to dedupe within a batch
  const lookback = Math.max(maxTopics, Math.min(200, Number(body.lookback ?? maxTopics * 10) || maxTopics * 10));
  const maxPerQuery = Math.max(1, Math.min(50, Number(body.maxPerQuery ?? 25) || 25));
  const language = validLang(body.language) ?? 'en';
  const classifyLimit = Math.max(0, Math.min(200, Number(body.classifyLimit ?? 100) || 100));
  const queueCeiling = Math.max(0, Math.min(5000, Number(body.queueCeiling ?? 300) || 300));
  const threshold = Number(process.env.CLASSIFY_CONFIDENCE_THRESHOLD ?? '0.8');

  const { count: queuedCount, error: queuedErr } = await supabaseServer
    .from('videos')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'queued');

  if (queuedErr) {
    return NextResponse.json({ ok: false, error: queuedErr.message }, { status: 500 });
  }

  // Split-mode: classify only
  if (mode === 'classify_only') {
    if (classifyLimit <= 0) {
      return NextResponse.json({ ok: true, mode, queuedCount: queuedCount ?? 0, classify: { processed: 0, published: 0, rejected: 0, failed: 0 } });
    }

    const classify = await classifyQueued({ limit: classifyLimit, threshold });
    return NextResponse.json({
      ok: true,
      mode,
      queuedCount: queuedCount ?? 0,
      classify,
      limits: { classifyLimit, threshold },
    });
  }

  // Backpressure: if queue is too large, skip imports and optionally classify only
  if ((queuedCount ?? 0) > queueCeiling) {
    const classify = classifyLimit > 0 ? await classifyQueued({ limit: classifyLimit, threshold }) : { processed: 0, published: 0, rejected: 0, failed: 0 };

    return NextResponse.json({
      ok: true,
      mode,
      backpressure: true,
      queueCeiling,
      queuedCount: queuedCount ?? 0,
      skippedImport: true,
      classify,
      limits: { classifyLimit, threshold },
      note: 'Import skipped because queued_count exceeded queueCeiling. Run again after queue is reduced.'
    });
  }

  // 1) Fetch top NEW requests
  const { data: rows, error } = await supabaseServer
    .from('topic_requests')
    .select('id, query_raw, query_norm, normalized_intent, request_count, last_requested_at, status')
    .eq('status', 'new')
    .order('request_count', { ascending: false })
    .order('last_requested_at', { ascending: false })
    .limit(lookback);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const reqs: TopicRequestRow[] = (rows ?? []) as TopicRequestRow[];

  // 2) Build canonical intents (safe MVP rules)
  // - exact normalized_intent match => merge
  // - for very short intents (<=5): levenshtein <= 1 against existing canonicals => merge
  const canon: TopicRequestRow[] = [];
  const merged: Array<{ id: string; merged_into: string; reason: string }> = [];

  for (const r of reqs) {
    const intent = normIntent(r.normalized_intent ?? r.query_norm ?? r.query_raw);
    if (!intent) continue;

    // exact match
    const exact = canon.find((c) => normIntent(c.normalized_intent ?? c.query_norm ?? c.query_raw) === intent);
    if (exact) {
      merged.push({ id: r.id, merged_into: exact.id, reason: 'exact' });
      continue;
    }

    // short typo match
    if (intent.length <= 5) {
      const best = canon
        .map((c) => {
          const ci = normIntent(c.normalized_intent ?? c.query_norm ?? c.query_raw);
          return { id: c.id, dist: levenshtein(intent, ci), ci };
        })
        .sort((a, b) => a.dist - b.dist)[0];

      if (best && best.dist <= 1) {
        merged.push({ id: r.id, merged_into: best.id, reason: `lev<=1:${best.ci}` });
        continue;
      }
    }

    canon.push({ ...r, normalized_intent: intent });
    if (canon.length >= maxTopics) break;
  }

  // 3) Mark canonicals as processing (we will import/classify in Step 3)
  const now = new Date().toISOString();
  if (canon.length > 0) {
    const canonIds = canon.map((c) => c.id);
    const { error: up1 } = await supabaseServer
      .from('topic_requests')
      .update({ status: 'processing', processed_at: now })
      .in('id', canonIds);
    if (up1) {
      return NextResponse.json({ ok: false, error: up1.message }, { status: 500 });
    }
  }

  // 4) Mark merged rows as merged
  if (merged.length > 0) {
    // Update one-by-one (small batch). We keep it explicit for clarity.
    for (const m of merged) {
      const { error: up2 } = await supabaseServer
        .from('topic_requests')
        .update({ status: 'merged', merged_into: m.merged_into, processed_at: now })
        .eq('id', m.id);
      if (up2) {
        return NextResponse.json({ ok: false, error: up2.message }, { status: 500 });
      }
    }
  }

  // 5) Import candidates for each canonical intent
  const importResults: Array<{ request_id: string; intent: string; attempted: number; inserted: number; errors: string[] }> = [];

  for (const c of canon) {
    const intent = normIntent(c.normalized_intent ?? c.query_norm ?? c.query_raw);
    const errors: string[] = [];
    let attempted = 0;
    let inserted = 0;

    const queries = [
      `${intent} beginner full course`,
      `${intent} intermediate tutorial`,
      `${intent} advanced tutorial`,
    ];

    for (const q of queries) {
      try {
        const r = await importYouTubeCandidates({ query: q, maxResults: maxPerQuery, language });
        attempted += r.attempted;
        inserted += r.inserted;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(msg);
      }
    }

    importResults.push({ request_id: c.id, intent, attempted, inserted, errors });
  }

  // 6) Classify queued videos (global cap)
  const classify = mode === 'import_only' || classifyLimit <= 0
    ? { processed: 0, published: 0, rejected: 0, failed: 0 }
    : await classifyQueued({ limit: classifyLimit, threshold });

  // 7) Finalize canonical requests
  // If a canonical had import errors and inserted nothing, mark it skipped.
  for (const r of importResults) {
    const status = r.inserted > 0 ? 'done' : 'skipped';
    const { error: up3 } = await supabaseServer
      .from('topic_requests')
      .update({ status, processed_at: new Date().toISOString() })
      .eq('id', r.request_id);
    if (up3) {
      return NextResponse.json({ ok: false, error: up3.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    queuedCount: queuedCount ?? 0,
    picked: canon.map((c) => ({ id: c.id, intent: normIntent(c.normalized_intent ?? c.query_norm ?? c.query_raw) })),
    merged,
    import: importResults,
    classify,
    limits: { mode, queueCeiling, maxTopics, lookback, maxPerQuery, classifyLimit },
  });
}