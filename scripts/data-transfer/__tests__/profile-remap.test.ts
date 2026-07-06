import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildProfileMap,
  formatUnresolvedProfileError,
  parseProfileRemaps,
  type SourceProfile,
  type TargetProfile
} from "../profile-remap.js";

const SOURCE_PROFILES: SourceProfile[] = [
  { id: "9b54ff2c-b0e0-4e77-99b9-cbaa7d25c57f", email: "codex-active-owner@example.test" },
  { id: "54599bc9-fa11-4a45-85ac-b79e62461de3", email: "alex@gmail.com" },
  { id: "ce8d8b04-51c6-45ce-b130-be7e8f3d0688", email: "codex-admin@example.test" }
];

const TARGET_PROFILES: TargetProfile[] = [
  { id: "11111111-1111-1111-1111-111111111111", email: "alex@bloomboys.online" },
  { id: "22222222-2222-2222-2222-222222222222", email: "sam@bloomboys.example" }
];

describe("parseProfileRemaps", () => {
  it("parses comma-separated source-id to target-email mappings", () => {
    assert.deepEqual(parseProfileRemaps("9b54ff2c-b0e0-4e77-99b9-cbaa7d25c57f:alex@bloomboys.online"), [
      { sourceKey: "9b54ff2c-b0e0-4e77-99b9-cbaa7d25c57f", targetEmail: "alex@bloomboys.online" }
    ]);
  });

  it("accepts source email keys and normalizes target email casing", () => {
    assert.deepEqual(parseProfileRemaps("tester@example.test:Alex@Bloomboys.Online"), [
      { sourceKey: "tester@example.test", targetEmail: "alex@bloomboys.online" }
    ]);
  });

  it("rejects malformed entries", () => {
    assert.throws(() => parseProfileRemaps("not-an-email:alex@bloomboys.online"), /source must be a profile UUID or email/);
    assert.throws(() => parseProfileRemaps("9b54ff2c-b0e0-4e77-99b9-cbaa7d25c57f:not-an-email"), /target must be a production profile email/);
  });
});

describe("buildProfileMap", () => {
  it("maps approved tester profiles to the production Alex profile", () => {
    const { entries, map } = buildProfileMap(SOURCE_PROFILES, TARGET_PROFILES, [
      { sourceKey: "9b54ff2c-b0e0-4e77-99b9-cbaa7d25c57f", targetEmail: "alex@bloomboys.online" },
      { sourceKey: "54599bc9-fa11-4a45-85ac-b79e62461de3", targetEmail: "alex@bloomboys.online" }
    ]);

    assert.equal(map.get("9b54ff2c-b0e0-4e77-99b9-cbaa7d25c57f"), "11111111-1111-1111-1111-111111111111");
    assert.equal(map.get("54599bc9-fa11-4a45-85ac-b79e62461de3"), "11111111-1111-1111-1111-111111111111");
    assert.equal(entries.length, 2);
    assert.ok(entries.every((entry) => entry.via === "explicit_remap"));
    assert.ok(entries.every((entry) => entry.targetEmail === "alex@bloomboys.online"));
  });

  it("reuses same-id profiles without an explicit remap entry", () => {
    const sharedId = "33333333-3333-3333-3333-333333333333";
    const { map, entries } = buildProfileMap(
      [{ id: sharedId, email: "sam@bloomboys.example" }],
      [{ id: sharedId, email: "sam@bloomboys.example" }],
      []
    );

    assert.equal(map.get(sharedId), sharedId);
    assert.deepEqual(entries, [
      {
        sourceEmail: "sam@bloomboys.example",
        sourceId: sharedId,
        targetEmail: "sam@bloomboys.example",
        targetId: sharedId,
        via: "same_id"
      }
    ]);
  });

  it("does not silently remap by email", () => {
    const { map } = buildProfileMap(SOURCE_PROFILES, TARGET_PROFILES, []);
    assert.equal(map.has("54599bc9-fa11-4a45-85ac-b79e62461de3"), false);
  });

  it("fails when PROFILE_REMAPS references an unknown source profile", () => {
    assert.throws(
      () => buildProfileMap(SOURCE_PROFILES, TARGET_PROFILES, [{ sourceKey: "missing@example.test", targetEmail: "alex@bloomboys.online" }]),
      /unknown source profile/
    );
  });

  it("fails when PROFILE_REMAPS references an unknown target email", () => {
    assert.throws(
      () =>
        buildProfileMap(SOURCE_PROFILES, TARGET_PROFILES, [
          { sourceKey: "9b54ff2c-b0e0-4e77-99b9-cbaa7d25c57f", targetEmail: "missing@bloomboys.online" }
        ]),
      /unknown target email/
    );
  });
});

describe("formatUnresolvedProfileError", () => {
  it("mentions PROFILE_REMAPS and includes source profile emails when available", () => {
    const message = formatUnresolvedProfileError(
      [{ column: "created_by", table: "tasks", value: "9b54ff2c-b0e0-4e77-99b9-cbaa7d25c57f" }],
      SOURCE_PROFILES
    );

    assert.match(message, /PROFILE_REMAPS/);
    assert.match(message, /codex-active-owner@example.test/);
  });
});
