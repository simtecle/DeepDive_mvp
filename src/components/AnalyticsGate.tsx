'use client';

import { useEffect, useMemo, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import {
  getConsent,
  onConsentChange,
  type ConsentState,
} from '@/lib/consent';

type Props = {
  /** Optional: can be provided by ClientShell; otherwise we read from localStorage. */
  consent?: ConsentState;
};

export function AnalyticsGate({ consent: consentProp }: Props) {
  const [consent, setConsentState] = useState<ConsentState>(() => consentProp ?? getConsent());

  // Keep state in sync when prop changes.
  useEffect(() => {
    if (consentProp) setConsentState(consentProp);
  }, [consentProp]);

  // Subscribe to same-tab and cross-tab consent updates.
  useEffect(() => {
    const off = onConsentChange(() => {
      // Only pull from storage if we are not controlled by a prop.
      if (!consentProp) setConsentState(getConsent());
    });
    return off;
  }, [consentProp]);

  const analyticsEnabled = useMemo(() => consent.analytics === true, [consent.analytics]);

  if (!analyticsEnabled) return null;

  return <Analytics />;
}