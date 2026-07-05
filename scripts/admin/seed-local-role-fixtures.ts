// Recreates the four local-only role fixture accounts that
// tests/integration/role-based-access-control.test.ts exercises against the
// REAL RLS policies. Safe to re-run (idempotent) and refuses to run against
// anything that is not local Supabase.
//
// See docs/production-launch.md "Local test fixtures" for context, and run
// this any time local Supabase is reset (`supabase db reset`) and the
// integration test suite reports the RLS fixtures are missing.
//
// Usage:
//   SUPABASE_URL=http://127.0.0.1:54321 \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
//     npm run admin:seed-local-fixtures
import { Client } from "pg";

import {
  createAuthUser,
  findAuthUserByEmail,
  isLocalSupabaseUrl,
  resolveDatabaseUrl,
  resolveSupabaseAdminTarget
} from "./lib.js";

// Matches tests/integration/support/harness.ts and
// tests/integration/role-based-access-control.test.ts exactly. Do not change
// these ids/emails/permission_levels without updating both of those files.
// permission_level is the raw database value (including the legacy 'owner'
// value two fixtures intentionally exercise), not the application AppRole.
const FIXTURES: Array<{
  displayName: string;
  email: string;
  id: string;
  permissionLevel: "admin" | "outreach_editor" | "owner";
  status: "active" | "inactive";
}> = [
  {
    displayName: "Codex Admin",
    email: "codex-admin@example.test",
    id: "124af66b-3a1b-4e62-8b08-5b82d6d24f8f",
    permissionLevel: "admin",
    status: "active"
  },
  {
    displayName: "Codex Outreach Editor",
    email: "codex-outreach-editor@example.test",
    id: "3c750f67-8269-43b2-a18d-cbd51bc6ce50",
    permissionLevel: "outreach_editor",
    status: "active"
  },
  {
    displayName: "Codex Active Owner",
    email: "codex-active-owner@example.test",
    id: "9b54ff2c-b0e0-4e77-99b9-cbaa7d25c57f",
    permissionLevel: "owner",
    status: "active"
  },
  {
    displayName: "Codex Inactive Owner",
    email: "codex-inactive-owner@example.test",
    id: "ce8d8b04-51c6-45ce-b130-be7e8f3d0688",
    permissionLevel: "owner",
    status: "inactive"
  }
];

const FIXED_LOCAL_PASSWORD = "local-test-fixture-password-only";

async function main() {
  const target = resolveSupabaseAdminTarget();
  if (!isLocalSupabaseUrl(target.url)) {
    throw new Error(
      `Refusing: SUPABASE_URL (${target.url}) is not local. This script only seeds local RLS test fixtures.`
    );
  }

  const databaseUrl = resolveDatabaseUrl();
  const db = new Client({ connectionString: databaseUrl });
  await db.connect();

  try {
    for (const fixture of FIXTURES) {
      const existing = await findAuthUserByEmail(target, fixture.email);
      if (!existing) {
        await createAuthUser(target, {
          email: fixture.email,
          id: fixture.id,
          password: FIXED_LOCAL_PASSWORD
        });
      } else if (existing.id !== fixture.id) {
        throw new Error(
          `${fixture.email} already exists locally with id ${existing.id}, expected ${fixture.id}. ` +
            "Delete the stale auth user in Supabase Studio and re-run."
        );
      }

      await db.query(
        `
          insert into public.profiles (id, email, display_name, permission_level, status)
          values ($1, $2, $3, $4, $5)
          on conflict (id) do update set
            email = excluded.email,
            display_name = excluded.display_name,
            permission_level = excluded.permission_level,
            status = excluded.status
        `,
        [fixture.id, fixture.email, fixture.displayName, fixture.permissionLevel, fixture.status]
      );
    }
  } finally {
    await db.end();
  }

  console.log(`Seeded ${FIXTURES.length} local role fixtures.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
