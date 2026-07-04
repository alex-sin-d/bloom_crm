import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { devToolsEnabled } from "../../lib/config/feature-visibility.js";

const env = process.env as Record<string, string | undefined>;
const originalNodeEnv = env.NODE_ENV;
const originalFlag = env.BLOOM_ENABLE_DEV_TOOLS;

function restoreEnv() {
  if (originalNodeEnv === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = originalNodeEnv;
  if (originalFlag === undefined) delete env.BLOOM_ENABLE_DEV_TOOLS;
  else env.BLOOM_ENABLE_DEV_TOOLS = originalFlag;
}

describe("development tool visibility", () => {
  afterEach(restoreEnv);

  it("shows development tools outside production", () => {
    env.NODE_ENV = "development";
    delete env.BLOOM_ENABLE_DEV_TOOLS;
    assert.equal(devToolsEnabled(), true);
  });

  it("hides development tools in production by default", () => {
    env.NODE_ENV = "production";
    delete env.BLOOM_ENABLE_DEV_TOOLS;
    assert.equal(devToolsEnabled(), false);
  });

  it("allows an explicit server-side override in production", () => {
    env.NODE_ENV = "production";
    env.BLOOM_ENABLE_DEV_TOOLS = "1";
    assert.equal(devToolsEnabled(), true);
  });
});
