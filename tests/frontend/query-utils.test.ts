import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { chunkIds, selectInChunks } from "../../lib/crm/query-utils.js";

function makeIds(count: number, prefix = "id"): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}-${index}`);
}

describe("chunkIds", () => {
  it("returns an empty array for an empty input", () => {
    assert.deepEqual(chunkIds([]), []);
  });

  it("de-duplicates ids before chunking", () => {
    assert.deepEqual(chunkIds(["a", "a", "b", "b", "b"], 100), [["a", "b"]]);
  });

  it("drops null/undefined/empty ids", () => {
    assert.deepEqual(
      chunkIds(["a", "", "b"] as string[], 100),
      [["a", "b"]]
    );
  });

  it("splits a list larger than the chunk size into multiple chunks", () => {
    const chunks = chunkIds(makeIds(263), 100);
    assert.equal(chunks.length, 3);
    assert.equal(chunks[0].length, 100);
    assert.equal(chunks[1].length, 100);
    assert.equal(chunks[2].length, 63);
  });

  it("defaults to a chunk size of 100", () => {
    const chunks = chunkIds(makeIds(150));
    assert.equal(chunks.length, 2);
    assert.equal(chunks[0].length, 100);
    assert.equal(chunks[1].length, 50);
  });
});

describe("selectInChunks", () => {
  it("short-circuits to an empty successful result for empty ids", async () => {
    let calls = 0;
    const result = await selectInChunks<string>([], async () => {
      calls += 1;
      return { data: [], error: null };
    });
    assert.equal(calls, 0);
    assert.deepEqual(result, { data: [], error: null });
  });

  it("runs one request per chunk and merges rows in order", async () => {
    const ids = makeIds(263);
    const seenChunkSizes: number[] = [];
    const result = await selectInChunks<{ id: string }>(ids, async (chunk) => {
      seenChunkSizes.push(chunk.length);
      return { data: chunk.map((id) => ({ id })), error: null };
    });

    assert.deepEqual(seenChunkSizes.sort((a, b) => b - a), [100, 100, 63]);
    assert.equal(result.error, null);
    assert.equal(result.data.length, 263);
    // rows come back covering every requested id
    assert.deepEqual(
      new Set(result.data.map((row) => row.id)),
      new Set(ids)
    );
  });

  it("propagates a genuine error instead of swallowing it", async () => {
    const ids = makeIds(150);
    const dbError = { code: "42501", message: "permission denied" };
    const result = await selectInChunks<{ id: string }>(ids, async (chunk) => {
      if (chunk.includes("id-120")) {
        return { data: null, error: dbError };
      }
      return { data: chunk.map((id) => ({ id })), error: null };
    });

    assert.equal(result.error, dbError);
    assert.deepEqual(result.data, []);
  });

  it("keeps each request small enough to stay under the URI limit", async () => {
    // 100 UUID-length ids kept well under the ~8 KB gateway limit that caused HTTP 414.
    const ids = makeIds(1000, "3f2504e0-4f89-41d3-9a0c-0305e82c3301");
    const urlLengths: number[] = [];
    await selectInChunks<{ id: string }>(ids, async (chunk) => {
      urlLengths.push(chunk.join(",").length);
      return { data: [], error: null };
    });
    assert.ok(Math.max(...urlLengths) < 8000, "each chunk URL id-list stays under 8 KB");
  });
});
