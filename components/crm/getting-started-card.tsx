"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "bloom-crm-getting-started-dismissed";

export function GettingStartedCard() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let isMounted = true;

    queueMicrotask(() => {
      if (isMounted && localStorage.getItem(STORAGE_KEY) === "true") {
        setIsVisible(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
  }

  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-forest">Getting started</p>
          <h2 className="mt-1 text-xl font-semibold text-text-heading">
            Use the CRM to choose which opportunities Bloom Boys wants to pursue.
          </h2>
          <ol className="mt-4 grid gap-3 text-sm leading-6 text-text-body md:grid-cols-2 xl:grid-cols-4">
            <li>1. Review a possible opportunity.</li>
            <li>2. Preview its research.</li>
            <li>3. Add it to Active Opportunities when Bloom Boys wants to pursue it.</li>
            <li>4. Open the opportunity to plan outreach.</li>
          </ol>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            className="rounded-control bg-brand-forest px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-deep"
            href="/research/opportunities"
          >
            Review opportunities
          </Link>
          <button
            className="rounded-control border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-body transition hover:bg-surface-subtle"
            onClick={dismiss}
            type="button"
          >
            Dismiss
          </button>
        </div>
      </div>
    </section>
  );
}
