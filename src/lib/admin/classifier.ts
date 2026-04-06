import { supabaseServer } from '@/lib/supabaseServer';

type DbVideo = {
  id: string;
  title: string;
  description: string | null;
  source_channel: string | null;
  language: string | null;
  duration_min: number | null;
  view_count: string | null;
  like_count: string | null;
  comment_count: string | null;
};

type ModelResult = {
  topic_name: string;
  subtopic_name: string | null;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Unknown';
  difficulty_score_1to5: number;
  tags: string[];
  prerequisites_text: string | null;
  confidence: number;
  notes: string | null;
};

type OpenAIOutputText = { type: 'output_text'; text: string };
type OpenAIOutputJson = { type: 'output_json'; json: unknown };
type OpenAIOutputItem = { content?: unknown };
type OpenAIResponses = { output?: unknown };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function normalizeTag(t: string) {
  return t.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^a-z0-9 -]/g, '');
}

function buildPrompt(v: DbVideo) {
  return `
You are classifying a YouTube learning video for a learning-path catalog.

Rules:
- topic_name: broad searchable topic like "Java Programming", "Data Structures", "Microeconomics".
- subtopic_name: optional like "OOP", "Recursion", "Graph Algorithms".
- level: intended audience.
- difficulty_score_1to5: 1 easiest, 5 hardest.
- tags: 5-12 short lowercase tags, comma-free, no duplicates.
- prerequisites_text: max 1-2 sentences or null.
- confidence: 0..1 how sure you are.
- notes: uncertainty/flags or null.

Video metadata:
- title: ${JSON.stringify(v.title)}
- channel: ${JSON.stringify(v.source_channel)}
- language_hint: ${JSON.stringify(v.language)}
- duration_min: ${JSON.stringify(v.duration_min)}
- views: ${JSON.stringify(v.view_count)}
- likes: ${JSON.stringify(v.like_count)}
- comments: ${JSON.stringify(v.comment_count)}

description:
${JSON.stringify((v.description ?? '').slice(0, 4000))}
`.trim();
}

function extractStructuredOutput(resp: OpenAIResponses): unknown | null {
  const out = resp.output;
  if (!Array.isArray(out)) return null;

  for (const item of out) {
    const it = item as OpenAIOutputItem;
    const content = it?.content;
    if (!Array.isArray(content)) continue;

    for (const c of content) {
      if (typeof c !== 'object' || c === null) continue;

      const asJson = c as Partial<OpenAIOutputJson>;
      if (asJson.type === 'output_json' && 'json' in asJson) return asJson.json ?? null;

      const asText = c as Partial<OpenAIOutputText>;
      if (asText.type === 'output_text' && typeof asText.text === 'string') {
        const t = asText.text.trim();
        if (!t) continue;
        try {
          return JSON.parse(t);
        } catch {}
      }
    }
  }

  return null;
}

function validateResult(x: unknown): { ok: true; val: ModelResult } | { ok: false; error: string } {
  if (typeof x !== 'object' || x === null) return { ok: false, error: 'not_object' };
  const o = x as Record<string, unknown>;

  const topic_name = typeof o.topic_name === 'string' ? o.topic_name.trim() : '';
  if (!topic_name) return { ok: false, error: 'missing_topic_name' };

  const subtopic_name =
    o.subtopic_name === null ? null : typeof o.subtopic_name === 'string' ? o.subtopic_name.trim() : null;

  const levelRaw = typeof o.level === 'string' ? o.level : 'Unknown';
  const level =
    levelRaw === 'Beginner' || levelRaw === 'Intermediate' || levelRaw === 'Advanced' || levelRaw === 'Unknown'
      ? levelRaw
      : 'Unknown';

  const diffRaw = typeof o.difficulty_score_1to5 === 'number' ? o.difficulty_score_1to5 : NaN;
  const difficulty_score_1to5 = Number.isFinite(diffRaw) ? clamp(Math.round(diffRaw), 1, 5) : 3;

  const tagsRaw = Array.isArray(o.tags) ? o.tags : [];
  const tags = tagsRaw
    .filter((t): t is string => typeof t === 'string')
    .map(normalizeTag)
    .filter((t) => t.length > 0)
    .filter((t, i, a) => a.indexOf(t) === i)
    .slice(0, 12);

  if (tags.length < 3) return { ok: false, error: 'tags_too_few' };

  const prerequisites_text =
    o.prerequisites_text === null
      ? null
      : typeof o.prerequisites_text === 'string'
      ? o.prerequisites_text.trim().slice(0, 240)
      : null;

  const confidenceRaw = typeof o.confidence === 'number' ? o.confidence : NaN;
  const confidence = Number.isFinite(confidenceRaw) ? clamp(confidenceRaw, 0, 1) : 0;

  const notes = o.notes === null ? null : typeof o.notes === 'string' ? o.notes.trim().slice(0, 240) : null;

  return { ok: true, val: { topic_name, subtopic_name, level, difficulty_score_1to5, tags, prerequisites_text, confidence, notes } };
}

async function callOpenAI(prompt: string): Promise<unknown> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('missing OPENAI_API_KEY');

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      input: prompt,
      temperature: 0.2,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'deepdive_video_classification',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              topic_name: { type: 'string' },
              subtopic_name: { type: ['string', 'null'] },
              level: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced', 'Unknown'] },
              difficulty_score_1to5: { type: 'number' },
              tags: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 12 },
              prerequisites_text: { type: ['string', 'null'] },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              notes: { type: ['string', 'null'] },
            },
            required: ['topic_name','subtopic_name','level','difficulty_score_1to5','tags','prerequisites_text','confidence','notes'],
          },
        },
      },
    }),
  });

  if (!res.ok) throw new Error(`openai_error:${await res.text()}`);

  const json = (await res.json()) as OpenAIResponses;
  const structured = extractStructuredOutput(json);
  if (structured === null) throw new Error('openai_no_structured_output');

  return structured;
}

export async function classifyQueued(args: { limit: number; threshold: number }): Promise<{
  processed: number;
  published: number;
  rejected: number;
  failed: number;
}> {
  const limit = clamp(args.limit, 1, 200);
  const threshold = args.threshold;

  const { data, error } = await supabaseServer
    .from('videos')
    .select('id,title,description,source_channel,language,duration_min,view_count,like_count,comment_count')
    .eq('status', 'queued')
    .limit(limit);

  if (error) throw new Error(`db_read_error:${error.message}`);
  const videos = (data ?? []) as DbVideo[];

  let published = 0;
  let rejected = 0;
  let failed = 0;

  for (const v of videos) {
    try {
      const raw = await callOpenAI(buildPrompt(v));
      const vr = validateResult(raw);

      if (!vr.ok) {
        const { error: updErr } = await supabaseServer
          .from('videos')
          .update({ status: 'failed', is_active: false, notes: `validate_failed:${vr.error}` })
          .eq('id', v.id);
        if (updErr) throw new Error(`db_update_failed:${updErr.message}`);
        failed++;
        continue;
      }

      const r = vr.val;
      const okToPublish = r.confidence >= threshold && r.level !== 'Unknown';

      const { error: updErr } = await supabaseServer
        .from('videos')
        .update({
          topic_name: r.topic_name,
          subtopic_name: r.subtopic_name,
          level: r.level,
          difficulty_score_1to5: r.difficulty_score_1to5,
          tags_text: r.tags.join(','),
          prerequisites_text: r.prerequisites_text,
          confidence: r.confidence,
          notes: r.notes,
          status: okToPublish ? 'published' : 'rejected',
          is_active: okToPublish,
        })
        .eq('id', v.id);
      if (updErr) throw new Error(`db_update_failed:${updErr.message}`);

      if (okToPublish) published++;
      else rejected++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const { error: updErr } = await supabaseServer
        .from('videos')
        .update({ status: 'failed', is_active: false, notes: `classify_failed:${msg}` })
        .eq('id', v.id);
      if (updErr) throw new Error(`db_update_failed:${updErr.message}`);
      failed++;
    }
  }

  return { processed: videos.length, published, rejected, failed };
}