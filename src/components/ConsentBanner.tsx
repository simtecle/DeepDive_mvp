'use client';

import { useEffect, useState } from 'react';
import { readConsent, writeConsent, type ConsentState } from '@/lib/consent';

type Props = {
  onChange: (consent: ConsentState) => void;
};

export function ConsentBanner({ onChange }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (!existing) setVisible(true);
  }, []);

  function accept() {
    const c: ConsentState = { analytics: true, updatedAt: new Date().toISOString() };
    writeConsent(c);
    onChange(c);
    setVisible(false);
  }

  function reject() {
    const c: ConsentState = { analytics: false, updatedAt: new Date().toISOString() };
    writeConsent(c);
    onChange(c);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-neutral-200">
          <div className="font-medium">Cookies & Analytics</div>
          <div className="text-neutral-400">
            We use analytics to understand usage and improve the product. You can accept or reject analytics tracking.
          </div>
          <div className="text-neutral-500">
            See our <a className="underline" href="/privacy">Privacy Policy</a>.
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={reject}
            className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:border-neutral-500"
          >
            Reject
          </button>
          <button
            onClick={accept}
            className="rounded-lg bg-neutral-200 px-3 py-2 text-sm text-neutral-900 hover:bg-white"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}