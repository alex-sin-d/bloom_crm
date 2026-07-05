import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isLocalSupabaseUrl, parseFlags } from "../lib.js";

describe("isLocalSupabaseUrl", () => {
  it("treats 127.0.0.1 and localhost as local", () => {
    assert.equal(isLocalSupabaseUrl("http://127.0.0.1:54321"), true);
    assert.equal(isLocalSupabaseUrl("http://localhost:54321"), true);
  });

  it("treats a hosted Supabase project URL as non-local", () => {
    assert.equal(isLocalSupabaseUrl("https://abcdefgh.supabase.co"), false);
  });

  it("treats an invalid URL as non-local rather than throwing", () => {
    assert.equal(isLocalSupabaseUrl("not-a-url"), false);
  });
});

describe("parseFlags", () => {
  it("parses --key value pairs", () => {
    const flags = parseFlags(["--email", "a@b.com", "--role", "admin"]);
    assert.deepEqual(flags, { email: "a@b.com", role: "admin" });
  });

  it("treats a flag with no following value as boolean true", () => {
    const flags = parseFlags(["--confirm-production", "--email", "a@b.com"]);
    assert.deepEqual(flags, { "confirm-production": true, email: "a@b.com" });
  });

  it("treats a trailing flag with no value as boolean true", () => {
    const flags = parseFlags(["--email", "a@b.com", "--force"]);
    assert.deepEqual(flags, { email: "a@b.com", force: true });
  });
});
