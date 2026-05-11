import { NextRequest, NextResponse } from 'next/server';
import { classifyQueued } from '@/lib/admin/classifier';

type Body = { limit?: number; threshold?: number };

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

    const maxLimit = Math.max(1, Math.min(500, Math.floor(Number(process.env.MAX_CLASSIFY_LIMIT ?? '200'))));
    const limitRaw = typeof body.limit === 'number' ? body.limit : 50;
    const limit = Math.max(1, Math.min(maxLimit, Math.floor(limitRaw)));

    const envThreshold = Number(process.env.CLASSIFY_CONFIDENCE_THRESHOLD ?? '0.8');
    const thresholdRaw = typeof body.threshold === 'number' ? body.threshold : envThreshold;
    const threshold = Number.isFinite(thresholdRaw) ? thresholdRaw : envThreshold;

    const minDurationMinutes = Number(process.env.MIN_DURATION_MINUTES ?? '5');
    const newTopicConfidenceOverride = Number(process.env.NEW_TOPIC_CONFIDENCE_OVERRIDE ?? '0.92');

    const result = await classifyQueued({ limit, threshold });

    return NextResponse.json({
      ok: true,
      threshold,
      limit,
      maxLimit,
      minDurationMinutes,
      newTopicConfidenceOverride,
      ...result,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}