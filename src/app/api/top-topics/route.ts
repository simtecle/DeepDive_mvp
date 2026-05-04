import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type TopicRow = {
  topic_name: string;
  published_count: number;
};

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) throw new Error('Missing Supabase env vars');
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function GET() {
  const supabase = supabaseAdmin();

  // SQL via RPC wäre sauberer, aber wir können erstmal über view-like query gehen:
  // Wir holen nur published+active und gruppieren topic_name.
  // Supabase JS kann group-by nur begrenzt elegant -> nutzen wir SQL über "rpc" wäre besser.
  // Minimal: use SQL in Supabase as a VIEW/RPC. Für jetzt: call a Postgres function.
  const { data, error } = await supabase.rpc('top_topics', { limit_n: 30 });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as TopicRow[];

  const res = NextResponse.json({ ok: true, topics: rows });

  // CDN cache: 5 min fresh, 10 min stale while revalidate
  res.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return res;
}