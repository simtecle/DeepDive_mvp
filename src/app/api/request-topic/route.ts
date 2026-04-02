import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';

function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '') // punctuation raus, letters/numbers/spaces/hyphen bleiben
    .replace(/\s+/g, ' ')
    .slice(0, 60);
}

function getIp(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return 'unknown';
}

function hashIp(ip: string): string {
  const salt = process.env.REQUEST_IP_SALT ?? 'salt';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const queryRaw = String(body?.query_raw ?? '');
    const queryNorm = normalizeQuery(queryRaw);

    if (!queryNorm) {
      return NextResponse.json({ accepted: false, reason: 'empty' }, { status: 400 });
    }

    // Rate limit: 3 requests/day/ip_hash
    const ip = getIp(req);
    const ipHash = hashIp(ip);
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Upsert/Increment ip limit counter
    const { data: ipRow, error: ipReadErr } = await supabaseServer
      .from('topic_request_ip_limits')
      .select('ip_hash, window_start, count')
      .eq('ip_hash', ipHash)
      .maybeSingle();

    if (ipReadErr) throw ipReadErr;

    if (!ipRow || ipRow.window_start !== today) {
      // reset window
      const { error: upErr } = await supabaseServer
        .from('topic_request_ip_limits')
        .upsert({ ip_hash: ipHash, window_start: today, count: 1 }, { onConflict: 'ip_hash' });
      if (upErr) throw upErr;
    } else {
      if (ipRow.count >= 3) {
        return NextResponse.json({ accepted: false, rate_limited: true }, { status: 429 });
      }
      const { error: updErr } = await supabaseServer
        .from('topic_request_ip_limits')
        .update({ count: ipRow.count + 1, updated_at: new Date().toISOString() })
        .eq('ip_hash', ipHash);
      if (updErr) throw updErr;
    }

    // Upsert topic request (dedupe by query_norm)
    const now = new Date().toISOString();
    const { data: existing, error: exErr } = await supabaseServer
      .from('topic_requests')
      .select('id, request_count')
      .eq('query_norm', queryNorm)
      .maybeSingle();

    if (exErr) throw exErr;

    if (!existing) {
      const { error: insErr } = await supabaseServer
        .from('topic_requests')
        .insert({
          query_raw: queryRaw,
          query_norm: queryNorm,
          request_count: 1,
          last_requested_at: now,
          status: 'new',
        });
      if (insErr) throw insErr;

      return NextResponse.json({ accepted: true, merged_into_existing: false, query_norm: queryNorm });
    }

    const { error: updErr } = await supabaseServer
      .from('topic_requests')
      .update({
        request_count: existing.request_count + 1,
        last_requested_at: now,
      })
      .eq('id', existing.id);

    if (updErr) throw updErr;

    return NextResponse.json({ accepted: true, merged_into_existing: true, query_norm: queryNorm });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ accepted: false, error: message }, { status: 500 });
  }
}