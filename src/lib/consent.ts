// src/lib/consent.ts
export type ConsentState = {
  analytics: boolean;
  updatedAt: string; // ISO
};

const KEY = 'ddv_consent_v1';

export function readConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (typeof parsed.analytics !== 'boolean') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(consent: ConsentState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(consent));
}

export function clearConsent() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
}

export const CONSENT_STORAGE_KEY = KEY;