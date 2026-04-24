'use client';

import { useEffect, useState } from 'react';
import type { ConsentState } from '@/lib/consent';

type Props = {
  consent: ConsentState;
  onChange: (next: ConsentState) => void;
};

export function ConsentBanner({ consent, onChange }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only if the user has not made a decision yet.
    setVisible(consent.decidedAt === null);
  }, [consent.decidedAt]);

  function accept() {
    onChange({ analytics: true, decidedAt: new Date().toISOString() });
    setVisible(false);
  }

  function reject() {
    onChange({ analytics: false, decidedAt: new Date().toISOString() });
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-neutral-200">
          <div className="font-medium">Cookies &amp; Analytics</div>
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