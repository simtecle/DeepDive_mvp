import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;

  // Vercel Cron invokes schedules with a special header. Allow either:
  //  - Authorization: Bearer <CRON_SECRET> (manual/curl)
  //  - x-vercel-cron: 1 (scheduled)
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const isAuthed = Boolean(expected) && auth === `Bearer ${expected}`;

  if (!isVercelCron && !isAuthed) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const origin = req.nextUrl.origin;

  // Call your existing admin processor (POST) internally.
  // IMPORTANT: keep this job small to avoid Vercel execution timeouts.
  const controller = new AbortController();
  const timeoutMs = 25_000;
  const t = setTimeout(() => controller.abort(), timeoutMs);

  const adminToken = process.env.ADMIN_TOKEN ?? '';
  if (!adminToken) {
    return NextResponse.json({ ok: false, error: 'missing_admin_token' }, { status: 500 });
  }

  const ceiling = Number(process.env.REQUEST_QUEUE_CEILING ?? '120');
  if (Number.isFinite(ceiling) && ceiling > 0) {
    // Ask admin endpoint for queued count cheaply by calling it with maxTopics=0.
    // If it still returns a queuedCount >= ceiling, we skip importing.
    try {
      const probe = await fetch(`${origin}/api/admin/process-topic-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ mode: 'import_only', maxTopics: 0, lookback: 0, maxPerQuery: 0, classifyLimit: 0, queueCeiling: ceiling }),
      });
      const probeJson = await probe.json().catch(() => null);
      const qc = typeof probeJson?.queuedCount === 'number' ? probeJson.queuedCount : null;
      if (qc !== null && qc >= ceiling) {
        return NextResponse.json({ ok: true, skipped: true, reason: 'queue_ceiling', queuedCount: qc, ceiling });
      }
    } catch {
      // ignore probe failures; proceed with the normal call
    }
  }

  const res = await fetch(`${origin}/api/admin/process-topic-requests`, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken,
    },
    body: JSON.stringify({
      // Import-first. Keep classify limited (or move classify to its own cron).
      mode: 'import_only',
      maxTopics: 2,
      lookback: 30,
      maxPerQuery: 15,
      language: 'en',
      // Keep low to prevent long OpenAI bursts inside this cron.
      classifyLimit: 0,
      queueCeiling: Number(process.env.REQUEST_QUEUE_CEILING ?? '120'),
    }),
  }).finally(() => clearTimeout(t));

  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } });
}