import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;

  // Secure: only Vercel cron should call this
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const origin = req.nextUrl.origin;

  // Call your existing admin processor (POST) internally
  const res = await fetch(`${origin}/api/admin/process-topic-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': process.env.ADMIN_TOKEN ?? '',
    },
    body: JSON.stringify({
      mode: 'full',
      maxTopics: 5,
      lookback: 100,
      maxPerQuery: 25,
      language: 'en',
      classifyLimit: 200,
      queueCeiling: 300,
    }),
  });

  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } });
}