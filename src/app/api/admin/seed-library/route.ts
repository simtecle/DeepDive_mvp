

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import SEED_TOPICS from '@/lib/seed/seedTopics';

function isAuthed(req: NextRequest): boolean {
  const token = req.headers.get('x-admin-token') ?? '';
  const expected = process.env.ADMIN_TOKEN ?? '';
  return Boolean(token && expected && token === expected);
}

function normalizeQuery(s: string): { raw: string; norm: string } {
  const raw = (s ?? '').trim().replace(/\s+/g, ' ');
  const norm = raw.toLowerCase();
  return { raw, norm };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type Body = {
  limit?: number; // how many seed topics to enqueue (default 80)
  dryRun?: boolean;
};

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const limit = Math.min(300, Math.max(1, Math.floor(Number(body.limit ?? 80))));
  const dryRun = Boolean(body.dryRun);

  // Normalize + dedupe within seed list
  const normalized = SEED_TOPICS
    .map((t) => normalizeQuery(t))
    .filter((x) => x.raw.length > 0);

  const seen = new Set<string>();
  const unique = normalized.filter((x) => {
    if (seen.has(x.norm)) return false;
    seen.add(x.norm);
    return true;
  });

  const batch = unique.slice(0, limit);
  const norms = batch.map((x) => x.norm);

  // Check which already exist in topic_requests
  const existing = new Set<string>();
  for (const part of chunk(norms, 200)) {
    const { data, error } = await supabaseServer
      .from('topic_requests')
      .select('query_norm')
      .in('query_norm', part);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    for (const r of data ?? []) {
      if (r?.query_norm) existing.add(String(r.query_norm));
    }
  }

  const toInsert = batch.filter((x) => !existing.has(x.norm));

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      requested: limit,
      seedTotal: unique.length,
      alreadyPresent: existing.size,
      wouldInsert: toInsert.length,
      sample: toInsert.slice(0, 10),
    });
  }

  const now = new Date().toISOString();

  let inserted = 0;
  const errors: string[] = [];

  for (const part of chunk(toInsert, 200)) {
    const rows = part.map((x) => ({
      query_raw: x.raw,
      query_norm: x.norm,
      request_count: 1,
      last_requested_at: now,
    }));

    const { data, error } = await supabaseServer
      .from('topic_requests')
      .insert(rows)
      .select('id');

    if (error) {
      errors.push(error.message);
      // stop early on DB errors to avoid partial inconsistent writes
      break;
    }

    inserted += (data ?? []).length;
  }

  return NextResponse.json({
    ok: errors.length === 0,
    requested: limit,
    seedTotal: unique.length,
    inserted,
    skippedExisting: existing.size,
    errors,
  });
}