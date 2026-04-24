'use client';

import type { ConsentState } from '@/lib/consent';
import { Analytics } from '@vercel/analytics/react';
// Optional: Speed Insights
// import { SpeedInsights } from '@vercel/speed-insights/next';

type Props = {
  consent: ConsentState;
};

export function AnalyticsGate({ consent }: Props) {
  if (!consent.analytics) return null;

  return (
    <>
      <Analytics />
      {/* <SpeedInsights /> */}
    </>
  );
}