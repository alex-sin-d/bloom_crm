"use server";

import { getProtectedSession } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { redirect } from "next/navigation";

export type SignInState = {
  error?: string;
};

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function safeRedirectPath(value: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  if (value.startsWith("/sign-in") || value.startsWith("/unauthorized")) {
    return "/dashboard";
  }

  return value;
}

export async function signInAction(
  _previousState: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  const nextPath = safeRedirectPath(readString(formData, "next"));

  if (!email || !password) {
    return { error: "Enter the email and password for an approved CRM account." };
  }

  if (!hasSupabaseEnv()) {
    return { error: "Supabase environment variables are not configured locally." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { error: "The email or password was not accepted." };
  }

  const session = await getProtectedSession();

  if (session.status !== "authorized") {
    await supabase.auth.signOut();
    return { error: "This account is not an active authorized CRM user." };
  }

  redirect(nextPath);
}

export async function signOutAction() {
  if (!hasSupabaseEnv()) {
    redirect("/sign-in");
  }

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
