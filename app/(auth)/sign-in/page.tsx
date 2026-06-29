import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SignInForm } from "@/components/crm/sign-in-form";

type SignInPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const isConfigured = hasSupabaseEnv();
  const { next } = await searchParams;

  return (
    <section className="w-full max-w-md rounded-card border border-border bg-surface p-8 shadow-soft">
      <div className="mb-8">
        <p className="text-sm font-medium text-text-muted">Bloom Boys</p>
        <h1 className="mt-2 text-3xl font-semibold text-text-heading">CRM sign in</h1>
        <p className="mt-3 text-sm leading-6 text-text-muted">
          Private Bloom Boys workspace.
        </p>
      </div>

      <SignInForm isConfigured={isConfigured} nextPath={next ?? "/dashboard"} />

      {!isConfigured ? (
        <p className="mt-5 rounded-control border border-border bg-surface-subtle px-3 py-2 text-sm text-text-muted">
          Supabase environment variables are not configured locally. Create a private `.env.local`
          from `.env.example` before testing sign-in.
        </p>
      ) : null}
    </section>
  );
}
