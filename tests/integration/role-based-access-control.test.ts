import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { activeOwnerClient, isLocalSupabaseUp } from "./support/harness.js";

// These tests exercise the REAL Postgres Row Level Security policies added in
// supabase/migrations/20260705010000_role_based_access_control_enum.sql and
// 20260705010100_role_based_access_control_rls.sql, using genuine signed JWTs
// for fixture profiles (no service-role bypass), exactly like the app does in
// production (see lib/supabase/server.ts - the app never uses the
// service-role key for normal requests). This proves the admin / outreach
// editor separation at the database layer, not just in application code.
//
// Fixture profiles (created once in local Supabase for this test suite; see
// docs/production-launch.md "Local test fixtures" for how they were made):
//   - codex-admin@example.test           permission_level = 'admin'
//   - codex-outreach-editor@example.test permission_level = 'outreach_editor'
//   - codex-active-owner@example.test    permission_level = 'owner'   (legacy)
//   - codex-inactive-owner@example.test  status = 'inactive'
const ADMIN_ID = "124af66b-3a1b-4e62-8b08-5b82d6d24f8f";
const OUTREACH_EDITOR_ID = "3c750f67-8269-43b2-a18d-cbd51bc6ce50";
const LEGACY_OWNER_ID = "9b54ff2c-b0e0-4e77-99b9-cbaa7d25c57f";
const INACTIVE_ID = "ce8d8b04-51c6-45ce-b130-be7e8f3d0688";

const supabaseUp = await isLocalSupabaseUp();
const skip = supabaseUp
  ? false
  : "local Supabase is not running (run `supabase start`) or the role fixtures have not been created";

async function hasFixtures(): Promise<boolean> {
  if (!supabaseUp) return false;
  const { data, error } = await activeOwnerClient(ADMIN_ID)
    .from("profiles")
    .select("id")
    .in("id", [ADMIN_ID, OUTREACH_EDITOR_ID]);
  return !error && (data?.length ?? 0) === 2;
}

const fixturesPresent = await hasFixtures();
const effectiveSkip = skip || (!fixturesPresent && "role fixture profiles are not present in local Supabase");

describe("role-based access control (real RLS)", { skip: effectiveSkip }, () => {
  it("current_profile_role() reports 'admin' for the admin fixture", async () => {
    const { data, error } = await activeOwnerClient(ADMIN_ID).rpc("current_profile_role");
    assert.equal(error, null);
    assert.equal(data, "admin");
  });

  it("current_profile_role() reports 'outreach_editor' for the outreach editor fixture", async () => {
    const { data, error } = await activeOwnerClient(OUTREACH_EDITOR_ID).rpc("current_profile_role");
    assert.equal(error, null);
    assert.equal(data, "outreach_editor");
  });

  it("current_profile_role() still reports 'admin' for the legacy 'owner' permission level", async () => {
    const { data, error } = await activeOwnerClient(LEGACY_OWNER_ID).rpc("current_profile_role");
    assert.equal(error, null);
    assert.equal(data, "admin");
  });

  it("current_profile_is_admin() is true for admin and legacy owner, false for outreach editor", async () => {
    const admin = await activeOwnerClient(ADMIN_ID).rpc("current_profile_is_admin");
    const legacyOwner = await activeOwnerClient(LEGACY_OWNER_ID).rpc("current_profile_is_admin");
    const editor = await activeOwnerClient(OUTREACH_EDITOR_ID).rpc("current_profile_is_admin");
    assert.equal(admin.data, true);
    assert.equal(legacyOwner.data, true);
    assert.equal(editor.data, false);
  });

  it("current_profile_is_active_owner() (shared CRM access) is true for both roles and false for inactive users", async () => {
    const admin = await activeOwnerClient(ADMIN_ID).rpc("current_profile_is_active_owner");
    const editor = await activeOwnerClient(OUTREACH_EDITOR_ID).rpc("current_profile_is_active_owner");
    const inactive = await activeOwnerClient(INACTIVE_ID).rpc("current_profile_is_active_owner");
    assert.equal(admin.data, true);
    assert.equal(editor.data, true);
    assert.equal(inactive.data, false);
  });

  it("outreach editor can read organizations (shared CRM data)", async () => {
    const { data, error } = await activeOwnerClient(OUTREACH_EDITOR_ID)
      .from("organizations")
      .select("id")
      .limit(1);
    assert.equal(error, null);
    assert.ok(Array.isArray(data));
  });

  it("outreach editor CAN create a new institution directly at the RLS layer (Sam's core workflow)", async () => {
    const editor = activeOwnerClient(OUTREACH_EDITOR_ID);
    const { data, error } = await editor
      .from("organizations")
      .insert({
        name: `RLS test org (editor create) ${Date.now()}`,
        organization_type: "other",
        created_by: OUTREACH_EDITOR_ID,
        updated_by: OUTREACH_EDITOR_ID,
        status: "research_only"
      })
      .select("id,created_by")
      .single();
    assert.equal(error, null);
    assert.equal(data?.created_by, OUTREACH_EDITOR_ID);

    // Clean up as admin (proves Alex can see and archive/delete what Sam created).
    const admin = activeOwnerClient(ADMIN_ID);
    await admin
      .from("organizations")
      .update({ status: "archived", archived_at: new Date().toISOString(), archived_by: ADMIN_ID })
      .eq("id", data!.id);
    await admin.from("organizations").delete().eq("id", data!.id);
  });

  it("outreach editor CANNOT change another user's role (blocked by RLS, not just the UI)", async () => {
    const before = await activeOwnerClient(ADMIN_ID)
      .from("profiles")
      .select("permission_level")
      .eq("id", OUTREACH_EDITOR_ID)
      .single();
    assert.equal(before.data?.permission_level, "outreach_editor");

    const { data, error } = await activeOwnerClient(OUTREACH_EDITOR_ID)
      .from("profiles")
      .update({ permission_level: "admin" })
      .eq("id", OUTREACH_EDITOR_ID)
      .select("id");

    // RLS on UPDATE silently matches zero rows instead of raising an error.
    assert.equal(error, null);
    assert.equal((data ?? []).length, 0);

    const after = await activeOwnerClient(ADMIN_ID)
      .from("profiles")
      .select("permission_level")
      .eq("id", OUTREACH_EDITOR_ID)
      .single();
    assert.equal(after.data?.permission_level, "outreach_editor");
  });

  it("admin CAN update another user's profile (role management)", async () => {
    const client = activeOwnerClient(ADMIN_ID);
    const original = await client
      .from("profiles")
      .select("display_name")
      .eq("id", OUTREACH_EDITOR_ID)
      .single();

    const { data, error } = await client
      .from("profiles")
      .update({ display_name: "Codex Outreach Editor (RLS test)" })
      .eq("id", OUTREACH_EDITOR_ID)
      .select("display_name");
    assert.equal(error, null);
    assert.equal(data?.[0]?.display_name, "Codex Outreach Editor (RLS test)");

    // Revert so re-running the suite is idempotent.
    await client
      .from("profiles")
      .update({ display_name: original.data?.display_name ?? "Codex Outreach Editor" })
      .eq("id", OUTREACH_EDITOR_ID);
  });

  it("outreach editor CANNOT permanently delete an archived organization", async () => {
    const admin = activeOwnerClient(ADMIN_ID);
    const created = await admin
      .from("organizations")
      .insert({
        name: `RLS test org (editor delete attempt) ${Date.now()}`,
        organization_type: "other",
        created_by: ADMIN_ID,
        updated_by: ADMIN_ID,
        status: "archived",
        archived_at: new Date().toISOString(),
        archived_by: ADMIN_ID
      })
      .select("id")
      .single();
    assert.equal(created.error, null);
    const organizationId = created.data!.id;

    const editor = activeOwnerClient(OUTREACH_EDITOR_ID);
    const { data, error } = await editor.from("organizations").delete().eq("id", organizationId).select("id");
    assert.equal(error, null);
    assert.equal((data ?? []).length, 0);

    const stillThere = await admin.from("organizations").select("id").eq("id", organizationId).maybeSingle();
    assert.ok(stillThere.data, "organization should still exist - outreach editor cannot hard delete");

    // Clean up using the admin permission this test just proved editors don't have.
    await admin.from("organizations").delete().eq("id", organizationId);
  });

  it("admin CANNOT permanently delete a NON-archived organization (must archive first)", async () => {
    const admin = activeOwnerClient(ADMIN_ID);
    const created = await admin
      .from("organizations")
      .insert({
        name: `RLS test org (not archived) ${Date.now()}`,
        organization_type: "other",
        created_by: ADMIN_ID,
        updated_by: ADMIN_ID,
        status: "research_only"
      })
      .select("id")
      .single();
    assert.equal(created.error, null);
    const organizationId = created.data!.id;

    const { data, error } = await admin.from("organizations").delete().eq("id", organizationId).select("id");
    assert.equal(error, null);
    assert.equal((data ?? []).length, 0, "delete must be blocked while archived_at is null");

    // Clean up: archive then delete, proving the full admin lifecycle works end-to-end.
    await admin
      .from("organizations")
      .update({ status: "archived", archived_at: new Date().toISOString(), archived_by: ADMIN_ID })
      .eq("id", organizationId);
    const finalDelete = await admin.from("organizations").delete().eq("id", organizationId).select("id");
    assert.equal(finalDelete.error, null);
    assert.equal((finalDelete.data ?? []).length, 1, "admin can hard delete once the record is archived");
  });
});
