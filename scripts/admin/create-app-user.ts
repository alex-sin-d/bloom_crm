// One-time / occasional admin script: creates (or updates the role/profile
// of) a single application user against WHATEVER Supabase project the
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars point to.
//
// This never runs automatically and is never imported by the app. Run it by
// hand with the correct environment variables for the target project. See
// docs/production-launch.md for the full production user creation runbook.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node .admin-dist/scripts/admin/create-app-user.js \
//       --email alex@example.com --name "Alex" --role admin \
//       --confirm-production
//
// Flags:
//   --email <email>            required
//   --name <display name>     required
//   --role admin|outreach_editor   required
//   --id <uuid>                optional: force this exact auth user id
//                              (use this to reuse a local profile id so a
//                              later data transfer needs no id remapping)
//   --password <password>     optional: only used if the user does not
//                              already exist; a strong random password is
//                              generated and printed once if omitted
//   --confirm-production       required when SUPABASE_URL is not local
//   --confirm-local            required when SUPABASE_URL IS local (rare;
//                              use scripts/admin/seed-local-role-fixtures.ts
//                              instead for local test fixtures)
import {
  createAuthUser,
  findAuthUserByEmail,
  generateTemporaryPassword,
  isLocalSupabaseUrl,
  parseFlags,
  resolveDatabaseUrl,
  resolveSupabaseAdminTarget,
  upsertProfile,
  type AppRole
} from "./lib.js";

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const email = requireString(flags.email, "--email");
  const displayName = requireString(flags.name, "--name");
  const role = requireRole(flags.role);
  const explicitId = typeof flags.id === "string" ? flags.id : undefined;
  const explicitPassword = typeof flags.password === "string" ? flags.password : undefined;

  const target = resolveSupabaseAdminTarget();
  const local = isLocalSupabaseUrl(target.url);

  if (local && !flags["confirm-local"]) {
    throw new Error(
      `SUPABASE_URL (${target.url}) is local. Pass --confirm-local if this is intentional, ` +
        "or use scripts/admin/seed-local-role-fixtures.ts for local RLS test fixtures."
    );
  }
  if (!local && !flags["confirm-production"]) {
    throw new Error(
      `SUPABASE_URL (${target.url}) is not local. Re-run with --confirm-production once you have ` +
        "confirmed this is the intended project (double check the URL above)."
    );
  }

  const existing = await findAuthUserByEmail(target, email);
  let userId: string;
  let createdNew = false;

  if (existing) {
    userId = existing.id;
    if (explicitId && explicitId !== existing.id) {
      throw new Error(
        `--id ${explicitId} was requested but ${email} already exists with a different id (${existing.id}). ` +
          "Refusing to change an existing user's id."
      );
    }
  } else {
    const password = explicitPassword ?? generateTemporaryPassword();
    const created = await createAuthUser(target, { email, id: explicitId, password });
    userId = created.id;
    createdNew = true;
    if (!explicitPassword) {
      console.log(
        `\nTemporary password for ${email} (shown once, share over a secure channel):\n  ${password}\n`
      );
    }
  }

  await upsertProfile(resolveDatabaseUrl(), { displayName, email, id: userId, role });

  console.log(
    JSON.stringify(
      {
        createdNewAuthUser: createdNew,
        email,
        id: userId,
        role,
        supabaseUrl: target.url
      },
      null,
      2
    )
  );
}

function requireString(value: string | boolean | undefined, flagName: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${flagName} is required.`);
  }
  return value.trim();
}

function requireRole(value: string | boolean | undefined): AppRole {
  if (value === "admin" || value === "outreach_editor") return value;
  throw new Error("--role must be 'admin' or 'outreach_editor'.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
