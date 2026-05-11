import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { importFromYouTube } from '@/lib/admin/importer';
import { classifyQueued } from '@/lib/admin/classifier';

type Body = {
  maxTopics?: number;
  maxPerQuery?: number;
  classifyLimit?: number;
  language?: string; // 'en' | 'de' | ''
  targets?: {
    beginner?: number;
    intermediate?: number;
    advanced?: number;
  };
  // If true, backfill will run even if there are pending user topic requests.
  force?: boolean;
};

type PivotRow = {
  topic_name: string;
  beginner_count: number;
  intermediate_count: number;
  advanced_count: number;
  total_published: number;
};

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;

function requireAdmin(req: NextRequest) {
  const token = req.headers.get('x-admin-token') ?? '';
  const expected = process.env.ADMIN_TOKEN ?? '';
  if (!expected || token !== expected) return false;
  return true;
}

function clampInt(n: unknown, fallback: number, min: number, max: number) {
  const v = Number.isFinite(Number(n)) ? Math.floor(Number(n)) : fallback;
  return Math.min(max, Math.max(min, v));
}

function nowPlusMs(ms: number) {
  return new Date(Date.now() + ms).toISOString();
}

async function queuedCount(): Promise<number> {
  const { count, error } = await supabaseServer
    .from('videos')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'queued');
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function pendingRequestsCount(): Promise<number> {
  const { count, error } = await supabaseServer
    .from('topic_requests')
    .select('id', { count: 'exact', head: true })
    .in('status', ['new', 'queued']);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function getPublishedCount(topic: string, level: (typeof LEVELS)[number]): Promise<number> {
  const { count, error } = await supabaseServer
    .from('videos')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .eq('is_active', true)
    .eq('topic_name', topic)
    .eq('level', level);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function getCooldown(topic: string, level: string) {
  const { data, error } = await supabaseServer
    .from('backfill_cooldowns')
    .select('topic_name, level, fail_streak, cooldown_until, last_attempt_at')
    .eq('topic_name', topic)
    .eq('level', level)
    .maybeSingle();

  if (error) return null;
  return data as
    | {
        topic_name: string;
        level: string;
        fail_streak: number;
        cooldown_until: string | null;
        last_attempt_at: string | null;
      }
    | null;
}

async function setCooldown(
  topic: string,
  level: string,
  opts: { success: boolean; details: any; cooldownMs?: number },
) {
  const current = await getCooldown(topic, level);
  const failStreak = opts.success ? 0 : (current?.fail_streak ?? 0) + 1;

  const cooldownUntil = opts.success ? null : nowPlusMs(opts.cooldownMs ?? 24 * 60 * 60 * 1000);

  const payload = {
    topic_name: topic,
    level,
    fail_streak: failStreak,
    last_attempt_at: new Date().toISOString(),
    cooldown_until: cooldownUntil,
    last_result: opts.details ?? null,
  };

  await supabaseServer.from('backfill_cooldowns').upsert(payload, { onConflict: 'topic_name,level' });
}

function queriesFor(topic: string, level: (typeof LEVELS)[number]) {
  // Keep it conservative: 2 queries per level.
  if (level === 'Beginner') {
    return [`"${topic}" beginner tutorial -shorts`, `"${topic}" introduction -shorts`];
  }
  if (level === 'Intermediate') {
    return [`"${topic}" intermediate tutorial -shorts`, `"${topic}" deep dive -shorts`];
  }
  // Advanced
  return [`"${topic}" advanced tutorial -shorts`, `"${topic}" masterclass -shorts`];
}

function cooldownForLevel(level: (typeof LEVELS)[number]) {
  // Earlier stop + longer cooldown.
  if (level === 'Advanced') return 7 * 24 * 60 * 60 * 1000; // 7 days
  if (level === 'Intermediate') return 3 * 24 * 60 * 60 * 1000; // 3 days
  return 24 * 60 * 60 * 1000; // 1 day
}

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;

  const targets = {
    Beginner: clampInt(body.targets?.beginner, 6, 0, 50),
    Intermediate: clampInt(body.targets?.intermediate, 4, 0, 50),
    Advanced: clampInt(body.targets?.advanced, 2, 0, 50),
  };

  const maxTopics = clampInt(body.maxTopics, 3, 1, 10);
  const maxPerQuery = clampInt(body.maxPerQuery, 25, 5, 50);
  const classifyLimit = clampInt(body.classifyLimit, 100, 0, 500);

  const language = (body.language ?? '').trim();

  // Backpressure: stop early.
  const ceiling = clampInt(process.env.BACKFILL_QUEUE_CEILING, 120, 20, 2000);
  const qCount = await queuedCount();
  if (qCount > ceiling) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'queue_ceiling',
      queuedCount: qCount,
      ceiling,
    });
  }

  // Priority: user requests first.
  const pending = await pendingRequestsCount();
  if (!body.force && pending > 0) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'pending_user_requests',
      pendingRequests: pending,
    });
  }

  // Pick topics with the largest total deficit.
  const { data: piv, error: pivErr } = await supabaseServer
    .from('topic_level_coverage_pivot')
    .select('topic_name,beginner_count,intermediate_count,advanced_count,total_published')
    .order('total_published', { ascending: true })
    .limit(200);

  if (pivErr) {
    return NextResponse.json({ ok: false, error: pivErr.message }, { status: 500 });
  }

  const rows = (piv ?? []) as PivotRow[];

  const scored = rows
    .map((r) => {
      const bDef = Math.max(0, targets.Beginner - (r.beginner_count ?? 0));
      const iDef = Math.max(0, targets.Intermediate - (r.intermediate_count ?? 0));
      const aDef = Math.max(0, targets.Advanced - (r.advanced_count ?? 0));
      const score = bDef + iDef + aDef;
      return { r, bDef, iDef, aDef, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      // Highest deficit first; tie-breaker: fewer total published first.
      if (b.score !== a.score) return b.score - a.score;
      return (a.r.total_published ?? 0) - (b.r.total_published ?? 0);
    })
    .slice(0, maxTopics);

  const results: any[] = [];

  for (const s of scored) {
    const topic = s.r.topic_name;
    const perTopic: any = {
      topic_name: topic,
      deficits: { Beginner: s.bDef, Intermediate: s.iDef, Advanced: s.aDef },
      levels: [] as any[],
    };

    for (const lvl of LEVELS) {
      const target = targets[lvl];
      if (target <= 0) continue;

      const before = await getPublishedCount(topic, lvl);
      const need = Math.max(0, target - before);
      if (need <= 0) continue;

      // Cooldown check.
      const cd = await getCooldown(topic, lvl);
      const cdUntil = cd?.cooldown_until ? new Date(cd.cooldown_until).getTime() : 0;
      if (cdUntil && cdUntil > Date.now()) {
        perTopic.levels.push({
          level: lvl,
          skipped: true,
          reason: 'cooldown',
          cooldown_until: cd?.cooldown_until,
          fail_streak: cd?.fail_streak ?? 0,
          before,
          target,
        });
        continue;
      }

      // Re-check queue ceiling before each level.
      const qNow = await queuedCount();
      if (qNow > ceiling) {
        perTopic.levels.push({
          level: lvl,
          skipped: true,
          reason: 'queue_ceiling',
          queuedCount: qNow,
          ceiling,
          before,
          target,
        });
        continue;
      }

      const qs = queriesFor(topic, lvl);
      let attempted = 0;
      let inserted = 0;
      const errors: string[] = [];

      // Import candidates (conservative: 2 queries per level)
      for (const q of qs) {
        try {
          const r = await importFromYouTube({
            query: q,
            maxResults: maxPerQuery,
            language: language || undefined,
          });
          attempted += r.attempted;
          inserted += r.upserted;

          // Earlier stop: if the query returned items but none were upserted,
          // don't keep digging deeper for this level.
          if (r.attempted > 0 && r.upserted === 0) break;
        } catch (e: any) {
          errors.push(String(e?.message ?? e));
          // On hard errors (API, rate limits, etc.), stop trying more queries for this level.
          break;
        }
      }

      // Classify a batch (shared queue) to publish.
      const classify =
        classifyLimit > 0
          ? await classifyQueued({
              limit: classifyLimit,
              threshold: Number(process.env.CLASSIFY_CONFIDENCE_THRESHOLD ?? '0.8'),
            })
          : { processed: 0, published: 0, rejected: 0, failed: 0 };

      const after = await getPublishedCount(topic, lvl);
      const publishedAdded = Math.max(0, after - before);

      const success = publishedAdded > 0;

      // Longer cooldown on failure, level-dependent.
      await setCooldown(topic, lvl, {
        success,
        cooldownMs: success ? undefined : cooldownForLevel(lvl),
        details: {
          before,
          after,
          target,
          need,
          attempted,
          inserted,
          publishedAdded,
          errors,
          classify,
        },
      });

      perTopic.levels.push({
        level: lvl,
        before,
        after,
        target,
        need,
        attempted,
        inserted,
        publishedAdded,
        classify,
        errors,
        success,
      });

      // Earlier stop: if we failed to add anything for this level, stop trying this level until cooldown.
      if (!success) break;
    }

    results.push(perTopic);
  }

  return NextResponse.json({
    ok: true,
    queuedCount: await queuedCount(),
    ceiling,
    pendingRequests: pending,
    targets,
    maxTopics,
    maxPerQuery,
    classifyLimit,
    language: language || null,
    processedTopics: results.length,
    results,
  });
}