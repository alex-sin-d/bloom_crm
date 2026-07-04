"use client";

import Link from "next/link";
import { useEffect } from "react";

// Route-level boundary: an Events failure stays inside /events and never
// takes down the Dashboard, Admin Tools, or any other route.
export default function EventsError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Events route error:", error);
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-4">
      <div className="w-full rounded-card border border-border bg-surface p-6 shadow-soft">
        <p className="text-sm font-semibold text-text-muted">Development</p>
        <h1 className="mt-2 text-2xl font-semibold text-text-heading">
          Events is temporarily unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-muted">
          Events is still in development and could not load. The rest of the CRM is not affected.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            className="h-10 rounded-control bg-brand-forest px-4 text-sm font-semibold leading-10 text-white"
            href="/admin-tools"
          >
            Return to Admin Tools
          </Link>
          <button
            className="h-10 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-body transition hover:bg-surface-subtle"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
        </div>
      </div>
    </section>
  );
}
