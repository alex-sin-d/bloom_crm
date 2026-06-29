import { signOutAction } from "@/app/(auth)/actions";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-page px-4 py-12">
      <section className="w-full max-w-xl rounded-card border border-border bg-surface p-6 shadow-soft">
        <p className="text-sm font-semibold text-brand-forest">Access denied</p>
        <h1 className="mt-2 text-2xl font-semibold text-text-heading">
          This account is not active for the CRM
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-muted">
          Bloom Boys CRM access requires a signed-in Supabase account with an active owner profile.
        </p>
        <form action={signOutAction} className="mt-5">
          <button
            className="h-10 rounded-control bg-brand-forest px-4 text-sm font-semibold text-white"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
