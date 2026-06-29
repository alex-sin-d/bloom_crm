import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export type ActiveOwnerProfile = {
  displayName: string;
  email: string;
  id: string;
  permissionLevel: "owner";
  status: "active";
};

export type ProtectedSession =
  | {
      profile: ActiveOwnerProfile;
      status: "authorized";
      user: User;
    }
  | {
      status: "unauthenticated";
      user: null;
    }
  | {
      status: "unauthorized";
      user: User;
    };

export async function getProtectedSession(): Promise<ProtectedSession> {
  if (!hasSupabaseEnv()) {
    return { status: "unauthenticated", user: null };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: "unauthenticated", user: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,display_name,status,permission_level")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.status !== "active" ||
    profile.permission_level !== "owner"
  ) {
    return { status: "unauthorized", user };
  }

  return {
    profile: {
      displayName: profile.display_name || profile.email,
      email: profile.email,
      id: profile.id,
      permissionLevel: profile.permission_level,
      status: profile.status
    },
    status: "authorized",
    user
  };
}

export async function requireActiveOwnerProfile() {
  const session = await getProtectedSession();

  if (session.status !== "authorized") {
    return session;
  }

  return session;
}

export async function requireAuthorizedSession() {
  const session = await getProtectedSession();

  if (session.status === "unauthenticated") {
    redirect("/sign-in");
  }

  if (session.status === "unauthorized") {
    redirect("/unauthorized");
  }

  return session;
}
