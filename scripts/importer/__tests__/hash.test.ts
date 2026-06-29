import assert from "node:assert/strict";
import test from "node:test";

import { canonicalJson, headerHash, rowHash, sha256Bytes } from "../hash.js";

test("file, header, and row hashes are deterministic", () => {
  assert.equal(sha256Bytes("Bloom"), sha256Bytes("Bloom"));
  assert.equal(
    headerHash(["Metric", "Value", "", ""]),
    "306e346fa441bd59255e9dcede0a8c7c7e7d3c4ff68311d696f98ecd0ca2aaa4",
  );

  const left = { b: 2, a: { d: 4, c: 3 } };
  const right = { a: { c: 3, d: 4 }, b: 2 };
  assert.equal(canonicalJson(left), canonicalJson(right));
  assert.equal(rowHash(left), rowHash(right));
});
