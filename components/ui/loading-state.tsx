export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-soft">
        <div className="h-2 w-28 rounded-chip bg-brand-cream" />
        <p className="mt-4 text-sm font-medium text-text-body">{label}</p>
        <div className="mt-4 space-y-2">
          <div className="h-3 rounded-chip bg-surface-subtle" />
          <div className="h-3 w-2/3 rounded-chip bg-surface-subtle" />
        </div>
      </div>
    </div>
  );
}
