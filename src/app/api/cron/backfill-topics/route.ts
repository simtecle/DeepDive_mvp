

import { NextRequest, NextResponse } from 'next/server';

function requireCron(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
  const expected = process.env.CRON_SECRET ?? '';
  return Boolean(expected && token && token === expected);
}

export async function GET(req: NextRequest) {
  if (!requireCron(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const adminToken = process.env.ADMIN_TOKEN ?? '';
  if (!adminToken) {
    return NextResponse.json({ ok: false, error: 'missing_admin_token' }, { status: 500 });
  }

  // Run daily with conservative defaults.
  // Backfill endpoint itself will stop early on backpressure or pending user requests.
  const body = {
    maxTopics: 2,
    maxPerQuery: 25,
    classifyLimit: 120,
    language: 'en',
    // Targets can be overridden later via env or by calling the admin endpoint directly.
    targets: { beginner: 6, intermediate: 4, advanced: 2 },
    force: false,
  };

  const origin = new URL(req.url).origin;
  const url = `${origin}/api/admin/backfill-topics`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-token': adminToken,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  // Pass-through JSON if possible, otherwise return raw text.
  try {
    const json = JSON.parse(text);
    return NextResponse.json({ ok: true, upstreamStatus: res.status, result: json });
  } catch {
    return NextResponse.json({ ok: true, upstreamStatus: res.status, resultText: text });
  }
}