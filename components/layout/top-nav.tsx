import { signOutAction } from "@/app/(auth)/actions";
import { adminToolsLink } from "@/lib/config/navigation";
import type { ActiveOwnerProfile } from "@/lib/auth/session";
import Link from "next/link";

export function TopNav({ profile }: { profile: ActiveOwnerProfile }) {
  return (
    <header className="border-b border-border bg-surface px-4 py-3 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="global-search">
            Search coming soon
          </label>
          <input
            className="h-10 w-full max-w-xl rounded-control border border-border bg-surface-subtle px-3 text-sm text-text-body"
            disabled
            id="global-search"
            placeholder="Search coming soon"
            type="search"
          />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop reaches Admin Tools from the sidebar; this keeps it reachable on mobile. */}
          <Link
            className="h-10 rounded-control border border-border bg-surface px-3 text-sm font-semibold leading-10 text-text-body transition hover:bg-surface-subtle lg:hidden"
            href={adminToolsLink.href}
          >
            {adminToolsLink.label}
          </Link>
          <div className="hidden rounded-chip border border-border bg-surface-subtle px-3 py-2 text-sm text-text-muted sm:block">
            {profile.displayName}
          </div>
          <form action={signOutAction}>
            <button
              className="h-10 rounded-control border border-border bg-surface px-3 text-sm font-semibold text-text-body transition hover:bg-surface-subtle"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
