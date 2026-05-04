// src/lib/consent.ts

/**
 * Minimal consent state.
 *
 * We keep the payload small and stable for localStorage.
 *
 * - `analytics`: whether analytics is allowed.
 * - `decidedAt`: ISO timestamp of the last decision, or null if no decision stored yet.
 *
 * Compatibility:
 * - Some call sites (or older code) may refer to `updatedAt`. We normalize it into `decidedAt`.
 */
export type ConsentState = {
  analytics: boolean;
  decidedAt: string | null;
  /**
   * Backwards-compatible alias used by some UIs.
   * Do not rely on it long-term; prefer `decidedAt`.
   */
  updatedAt?: string | null;
};

const STORAGE_KEY = "ddv_consent";
export const CONSENT_STORAGE_KEY = STORAGE_KEY;

// Fired on the same tab when consent changes.
const CONSENT_EVENT = "ddv:consent-changed";

function nowIso(): string {
  return new Date().toISOString();
}

function normalize(parsed: unknown): ConsentState {
  const obj = (parsed ?? {}) as Partial<Record<string, unknown>>;

  const decidedAtCandidate =
    typeof obj.decidedAt === "string"
      ? obj.decidedAt
      : typeof obj.updatedAt === "string"
        ? (obj.updatedAt as string)
        : null;

  return {
    analytics: obj.analytics === true,
    decidedAt: decidedAtCandidate,
    // keep alias in-memory so UIs that read it don't break
    updatedAt: decidedAtCandidate,
  };
}

function dispatchConsentChanged(): void {
  if (typeof window === "undefined") return;
  // Same-tab listeners.
  window.dispatchEvent(new Event(CONSENT_EVENT));
  // Cross-tab listeners.
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
}

/**
 * SSR-safe: on the server, returns a default "no analytics" state.
 * On the client, returns the stored state if present.
 */
export function getConsent(): ConsentState {
  if (typeof window === "undefined") return { analytics: false, decidedAt: null, updatedAt: null };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { analytics: false, decidedAt: null, updatedAt: null };
    return normalize(JSON.parse(raw));
  } catch {
    return { analytics: false, decidedAt: null, updatedAt: null };
  }
}

/**
 * Writes consent to localStorage.
 * If `decidedAt` is omitted or null, it will be set to the current time.
 */
export function setConsent(next: ConsentState): void {
  if (typeof window === "undefined") return;

  const decidedAt = next.decidedAt ?? next.updatedAt ?? nowIso();

  const normalized: ConsentState = {
    analytics: next.analytics === true,
    decidedAt,
    updatedAt: decidedAt,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  dispatchConsentChanged();
}

/**
 * Returns null if no decision has ever been made (legacy helper).
 */
export function readConsent(): ConsentState | null {
  const c = getConsent();
  return c.decidedAt ? c : null;
}

export function writeConsent(consent: ConsentState): void {
  setConsent(consent);
}

export function clearConsent(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  dispatchConsentChanged();
}

/**
 * Convenience helper for settings UIs.
 */
export function hasConsentDecision(): boolean {
  return getConsent().decidedAt !== null;
}

/**
 * Subscribe to consent changes (same tab + other tabs).
 * Returns an unsubscribe function.
 */
export function onConsentChange(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onSameTab = () => handler();
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === STORAGE_KEY) handler();
  };

  window.addEventListener(CONSENT_EVENT, onSameTab);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(CONSENT_EVENT, onSameTab);
    window.removeEventListener("storage", onStorage);
  };
}