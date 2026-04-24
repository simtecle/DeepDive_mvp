// src/app/privacy/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | DeepDivePath",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Privacy Policy</h1>

      <p className="mt-4 text-neutral-200">
        This site is operated from Germany. The full privacy policy is provided in German at{" "}
        <a className="underline" href="/datenschutz">/datenschutz</a>.
        This English page is a convenience summary.
      </p>

      <section className="mt-10 border-t border-neutral-800 pt-8">
        <h2 className="text-xl font-semibold">Cloudflare (Domain / DNS)</h2>
        <p className="mt-3 text-neutral-200">
          We use Cloudflare for domain registration and DNS services. This may involve processing technical data
          (e.g., IP address, timestamps, requested domain/record information) to resolve DNS requests and operate the domain.
        </p>
      </section>

      <section className="mt-10 border-t border-neutral-800 pt-8">
        <h2 className="text-xl font-semibold">Vercel Web Analytics</h2>
        <p className="mt-3 text-neutral-200">
          If you consent, we use Vercel Web Analytics to measure usage and improve the product. You can withdraw your
          consent at any time via the consent settings.
        </p>
      </section>

      <section className="mt-10 border-t border-neutral-800 pt-8">
        <h2 className="text-xl font-semibold">YouTube Thumbnails</h2>
        <p className="mt-3 text-neutral-200">
          We load thumbnail images for linked YouTube videos from YouTube/Google servers (e.g., i.ytimg.com). This request
          may transmit your IP address and technical connection data to the provider.
        </p>
      </section>
    </main>
  );
}