'use client';

import { useEffect, useState } from 'react';
import { readConsent, type ConsentState } from '@/lib/consent';

// Vercel Analytics (nur wenn du es nutzt)
import { Analytics } from '@vercel/analytics/react';
// Optional: Speed Insights
// import { SpeedInsights } from '@vercel/speed-insights/next';

export function AnalyticsGate() {
  const [consent, setConsent] = useState<ConsentState | null>(null);

  useEffect(() => {
    setConsent(readConsent());
  }, []);

  if (!consent?.analytics) return null;

  return (
    <>
      <Analytics />
      {/* <SpeedInsights /> */}
    </>
  );
}