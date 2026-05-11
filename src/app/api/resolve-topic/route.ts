import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();

  if (!q) return NextResponse.json({ ok: false, reason: 'empty' }, { status: 400 });

  const { data, error } = await supabaseServer
    .rpc('resolve_canonical_topic', { q });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const best = Array.isArray(data) && data.length ? data[0] : null;

  if (!best) {
    return NextResponse.json({ ok: false, reason: 'no_match' });
  }

  return NextResponse.json({
    ok: true,
    topic_name: best.topic_name,
    topic_key: best.topic_key,
    match_type: best.match_type,
    score: best.score,
  });
}