"use client";

export function ErrorState({
  message,
  onRetry,
  title
}: {
  message?: string;
  onRetry: () => void;
  title: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-page px-4">
      <section className="w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-soft">
        <p className="text-sm font-semibold text-brand-forest">Bloom Boys CRM</p>
        <h1 className="mt-2 text-2xl font-semibold text-text-heading">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-text-muted">
          {message || "The workspace could not finish loading."}
        </p>
        <button
          className="mt-5 h-10 rounded-control bg-brand-forest px-4 text-sm font-semibold text-white"
          onClick={onRetry}
          type="button"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
