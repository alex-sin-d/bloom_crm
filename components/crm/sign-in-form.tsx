"use client";

import { signInAction, type SignInState } from "@/app/(auth)/actions";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

const initialState: SignInState = {};

function SignInButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="h-11 w-full rounded-control bg-brand-forest px-4 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Signing in" : "Sign in"}
    </button>
  );
}

export function SignInForm({
  isConfigured,
  nextPath
}: {
  isConfigured: boolean;
  nextPath: string;
}) {
  const [state, formAction] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input name="next" type="hidden" value={nextPath} />
      <label className="block">
        <span className="text-sm font-medium text-text-body">Email</span>
        <input
          className="mt-2 h-11 w-full rounded-control border border-border bg-white px-3 text-sm text-text-body"
          name="email"
          type="email"
          autoComplete="email"
          disabled={!isConfigured}
          required
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-text-body">Password</span>
        <input
          className="mt-2 h-11 w-full rounded-control border border-border bg-white px-3 text-sm text-text-body"
          name="password"
          type="password"
          autoComplete="current-password"
          disabled={!isConfigured}
          required
        />
      </label>
      <SignInButton />
      {state.error ? (
        <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
