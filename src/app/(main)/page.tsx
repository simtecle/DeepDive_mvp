import Link from "next/link";

export default function HomePage() {
  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">DeepDive</h1>
        <p className="text-neutral-400">
          Start here, then search a topic to get a curated learning path.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="text-lg font-medium">Beginner</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Foundations. Minimal prerequisites.
          </p>
          <Link
            href="/search?level=Beginner"
            className="inline-block mt-4 underline underline-offset-4"
          >
            Search beginner topics
          </Link>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="text-lg font-medium">Intermediate</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Build depth. Assumes basics.
          </p>
          <Link
            href="/search?level=Intermediate"
            className="inline-block mt-4 underline underline-offset-4"
          >
            Search intermediate topics
          </Link>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="text-lg font-medium">Advanced</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Harder material. Specialized.
          </p>
          <Link
            href="/search?level=Advanced"
            className="inline-block mt-4 underline underline-offset-4"
          >
            Search advanced topics
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="text-lg font-medium">Go to Search</h2>
        <p className="text-sm text-neutral-400 mt-1">
          Use the search page for your learning path.
        </p>
        <Link
          href="/search"
          className="inline-block mt-4 bg-neutral-200 text-neutral-900 rounded-lg px-3 py-2"
        >
          Open Search
        </Link>
      </section>
    </main>
  );
}