import { hasSupabaseEnv } from "@/lib/supabase/env";

export default function SignInPage() {
  const isConfigured = hasSupabaseEnv();

  return (
    <section className="w-full max-w-md rounded-card border border-border bg-surface p-8 shadow-soft">
      <div className="mb-8">
        <p className="text-sm font-medium text-text-muted">Bloom Boys</p>
        <h1 className="mt-2 text-3xl font-semibold text-text-heading">CRM sign in</h1>
        <p className="mt-3 text-sm leading-6 text-text-muted">
          Private workspace for Alex and Sam.
        </p>
      </div>

      <form className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-text-body">Email</span>
          <input
            className="mt-2 h-11 w-full rounded-control border border-border bg-white px-3 text-sm text-text-body"
            name="email"
            type="email"
            autoComplete="email"
            disabled
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-text-body">Password</span>
          <input
            className="mt-2 h-11 w-full rounded-control border border-border bg-white px-3 text-sm text-text-body"
            name="password"
            type="password"
            autoComplete="current-password"
            disabled
          />
        </label>
        <button
          className="h-11 w-full rounded-control bg-brand-forest px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled
          type="button"
        >
          Sign in
        </button>
      </form>

      {!isConfigured ? (
        <p className="mt-5 rounded-control border border-border bg-surface-subtle px-3 py-2 text-sm text-text-muted">
          Supabase environment placeholders are ready in .env.example.
        </p>
      ) : null}
    </section>
  );
}
