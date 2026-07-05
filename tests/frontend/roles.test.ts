import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PERMISSIONS,
  permissionLevelToRole,
  permissionsForRole,
  roleHasPermission
} from "../../lib/auth/roles.js";

describe("role permission matrix", () => {
  it("admin holds every defined permission", () => {
    for (const permission of Object.values(PERMISSIONS)) {
      assert.equal(roleHasPermission("admin", permission), true, `admin should have ${permission}`);
    }
  });

  it("outreach_editor holds only the everyday CRM permissions", () => {
    assert.equal(roleHasPermission("outreach_editor", PERMISSIONS.USE_CRM), true);
    assert.equal(roleHasPermission("outreach_editor", PERMISSIONS.ARCHIVE_RECORDS), true);
  });

  it("outreach_editor does NOT hold admin-only permissions", () => {
    assert.equal(roleHasPermission("outreach_editor", PERMISSIONS.PERMANENT_DELETE), false);
    assert.equal(roleHasPermission("outreach_editor", PERMISSIONS.RUN_DATASET_IMPORTS), false);
    assert.equal(roleHasPermission("outreach_editor", PERMISSIONS.MANAGE_USERS), false);
    assert.equal(roleHasPermission("outreach_editor", PERMISSIONS.ACCESS_ADMIN_TOOLS), false);
  });

  it("permissionsForRole never grants outreach_editor an admin-only permission", () => {
    const editorPermissions = new Set(permissionsForRole("outreach_editor"));
    for (const adminOnly of [
      PERMISSIONS.PERMANENT_DELETE,
      PERMISSIONS.RUN_DATASET_IMPORTS,
      PERMISSIONS.MANAGE_USERS,
      PERMISSIONS.ACCESS_ADMIN_TOOLS
    ]) {
      assert.equal(editorPermissions.has(adminOnly), false);
    }
  });

  it("maps legacy 'owner' and 'admin' permission levels to the admin role", () => {
    assert.equal(permissionLevelToRole("owner"), "admin");
    assert.equal(permissionLevelToRole("admin"), "admin");
  });

  it("maps 'outreach_editor' and any unknown value to outreach_editor (fail closed, never fail open to admin)", () => {
    assert.equal(permissionLevelToRole("outreach_editor"), "outreach_editor");
    assert.equal(permissionLevelToRole("something_unexpected"), "outreach_editor");
  });
});
