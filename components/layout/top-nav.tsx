export function TopNav({ userEmail }: { userEmail: string }) {
  return (
    <header className="border-b border-border bg-surface px-4 py-3 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="global-search">
            Search CRM
          </label>
          <input
            className="h-10 w-full max-w-xl rounded-control border border-border bg-surface-subtle px-3 text-sm text-text-body"
            disabled
            id="global-search"
            placeholder="Search opportunities, organizations, contacts"
            type="search"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            className="hidden h-10 rounded-control border border-border bg-surface px-3 text-sm font-medium text-text-body md:inline-flex md:items-center"
            disabled
            type="button"
          >
            Quick action
          </button>
          <div className="rounded-chip border border-border bg-surface-subtle px-3 py-2 text-sm text-text-muted">
            {userEmail}
          </div>
        </div>
      </div>
    </header>
  );
}
