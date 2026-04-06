import { NextRequest, NextResponse } from 'next/server';
import { classifyQueued } from '@/lib/admin/classifier';

type Body = { limit?: number };

function requireAdmin(req: NextRequest) {
  const token = req.headers.get('x-admin-token');
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(expected && token === expected);
}

export async function POST(req: NextRequest) {
  try {
    if (!requireAdmin(req)) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const limitRaw = typeof body.limit === 'number' ? body.limit : 5;
    const limit = Math.max(1, Math.min(20, Math.floor(limitRaw)));

    const threshold = Number(process.env.CLASSIFY_CONFIDENCE_THRESHOLD ?? '0.8');

    const result = await classifyQueued({ limit, threshold });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}