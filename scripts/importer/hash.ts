import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export function sha256Bytes(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function sha256File(path: string): Promise<string> {
  return sha256Bytes(await readFile(path));
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortForJson(value));
}

export function headerHash(headers: readonly string[]): string {
  return sha256Bytes(
    JSON.stringify(headers, (_key, value: unknown) => value),
  );
}

export function rowHash(rawValuesJson: unknown): string {
  return sha256Bytes(canonicalJson(rawValuesJson));
}

function sortForJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortForJson(item));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortForJson(record[key]);
    }
    return sorted;
  }

  return value;
}
