"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AnalyticsGate } from "@/components/AnalyticsGate";
import { ConsentBanner } from "@/components/ConsentBanner";
import { getConsent, setConsent, type ConsentState } from "@/lib/consent";

const CONSENT_STORAGE_KEY = "ddv_consent";

export function ClientShell({ children }: { children: React.ReactNode }) {
  // SSR-safe initializer. `getConsent()` must not touch `window` when undefined.
  const [consent, setConsentState] = useState<ConsentState>(() => getConsent());

  // Keep consent in sync across tabs/windows.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_STORAGE_KEY) setConsentState(getConsent());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const onConsentChange = useCallback((next: ConsentState) => {
    setConsent(next);
    setConsentState(next);
  }, []);

  return (
    <>
      {children}
      <AnalyticsGate consent={consent} />
      <ConsentBanner consent={consent} onChange={onConsentChange} />
    </>
  );
}