'use client';

import { clearConsent } from '@/lib/consent';

export function Footer() {
  return (
    <footer className="border-t border-neutral-800 mt-10">
      <div className="mx-auto max-w-5xl px-6 py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-neutral-400">
        <div>© {new Date().getFullYear()} DeepDive</div>

        <div className="flex gap-4">
          <a className="underline underline-offset-4 hover:text-neutral-200" href="/impressum">
            Impressum
          </a>
          <a className="underline underline-offset-4 hover:text-neutral-200" href="/privacy">
            Datenschutz
          </a>

          <button
            className="underline underline-offset-4 hover:text-neutral-200"
            onClick={() => {
              clearConsent();
              window.location.reload();
            }}
          >
            Cookie-Einstellungen
          </button>
        </div>
      </div>
    </footer>
  );
}