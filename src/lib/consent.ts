// src/lib/consent.ts

/**
 * Minimal consent state for the MVP.
 * `decidedAt` is ISO timestamp (or null if no decision stored yet).
 */
export type ConsentState = {
  analytics: boolean;
  decidedAt: string | null;
};

const STORAGE_KEY = "ddv_consent";

export const CONSENT_STORAGE_KEY = STORAGE_KEY;

/**
 * SSR-safe: on the server, returns a default "no consent" state.
 */
export function getConsent(): ConsentState {
  if (typeof window === "undefined") return { analytics: false, decidedAt: null };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { analytics: false, decidedAt: null };

    const parsed = JSON.parse(raw) as Partial<ConsentState>;

    return {
      analytics: parsed.analytics === true,
      decidedAt: typeof parsed.decidedAt === "string" ? parsed.decidedAt : null,
    };
  } catch {
    return { analytics: false, decidedAt: null };
  }
}

export function setConsent(next: ConsentState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/**
 * Backward-compatible aliases used elsewhere in the codebase.
 */
export function readConsent(): ConsentState | null {
  const c = getConsent();
  // If no decision has ever been made, keep old behaviour (null).
  return c.decidedAt ? c : null;
}

export function writeConsent(consent: ConsentState): void {
  setConsent(consent);
}

export function clearConsent(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}