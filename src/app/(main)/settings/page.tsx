'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { clearConsent, getConsent, setConsent, type ConsentState } from '@/lib/consent';

function fmt(ts?: string | null) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function SettingsPage() {
  const [consent, setConsentState] = useState<ConsentState | null>(null);
  const analyticsEnabled = useMemo(() => consent?.analytics === true, [consent]);

  useEffect(() => {
    setConsentState(getConsent());
  }, []);

  function accept() {
    const next: ConsentState = { analytics: true, decidedAt: new Date().toISOString() };
    setConsent(next);
    setConsentState(next);
    // No reload: AnalyticsGate sollte auf consent reagieren.
  }

  function reject() {
    const next: ConsentState = { analytics: false, decidedAt: new Date().toISOString() };
    setConsent(next);
    setConsentState(next);
  }

  function reset() {
    clearConsent();
    setConsentState(null);
  }

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-neutral-400">
          Manage privacy and analytics preferences.
        </p>
      </header>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-4">
        <div>
          <h2 className="text-lg font-medium">Privacy & Analytics</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Analytics are only enabled after you opt in.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-sm">
            Status:{' '}
            <span className={analyticsEnabled ? 'text-emerald-400' : 'text-neutral-400'}>
              {consent === null ? 'No choice yet' : analyticsEnabled ? 'Analytics enabled' : 'Analytics disabled'}
            </span>
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={accept}
            className="rounded-lg bg-neutral-200 text-neutral-900 px-3 py-2 text-sm"
          >
            Accept analytics
          </button>
          <button
            onClick={reject}
            className="rounded-lg border border-neutral-700 px-3 py-2 text-sm"
          >
            Reject analytics
          </button>
          <button
            onClick={reset}
            className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300"
          >
            Reset choice
          </button>
        </div>

        <p className="text-xs text-neutral-500">
          See details in our{' '}
          <Link className="underline underline-offset-4" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}