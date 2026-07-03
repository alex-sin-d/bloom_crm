export class CrmQueryError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "CrmQueryError";
  }
}

export function failOnError(error: unknown, message: string) {
  if (error) {
    throw new CrmQueryError(message, error);
  }
}

export function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

/**
 * Default batch size for chunked `.in(...)` lookups. supabase-js sends `.in()` as an HTTP GET
 * with every id inline in the URL, so a large id list overflows the PostgREST/Kong gateway URI
 * limit (~8 KB) and returns HTTP 414. 100 UUIDs keeps the URL near ~3.7 KB — a safe margin.
 */
export const IN_CHUNK_SIZE = 100;

/**
 * Split a list of ids into de-duplicated chunks of at most `size`. Pure and DB-free.
 */
export function chunkIds(ids: string[], size: number = IN_CHUNK_SIZE): string[][] {
  const unique = uniqueValues(ids);
  if (unique.length === 0) return [];
  const chunks: string[][] = [];
  for (let index = 0; index < unique.length; index += size) {
    chunks.push(unique.slice(index, index + size));
  }
  return chunks;
}

/**
 * Run a Supabase `.in(...)` lookup in id-list chunks and merge the rows, so large id lists do
 * not overflow the gateway URI limit (HTTP 414). Chunks run in parallel; the first genuine
 * error is returned unchanged so real failures still propagate through `failOnError`.
 */
export async function selectInChunks<T>(
  ids: string[],
  runChunk: (chunk: string[]) => PromiseLike<{ data: T[] | null; error: unknown }>,
  size: number = IN_CHUNK_SIZE
): Promise<{ data: T[]; error: unknown }> {
  const chunks = chunkIds(ids, size);
  if (chunks.length === 0) return { data: [], error: null };

  const results = await Promise.all(chunks.map((chunk) => runChunk(chunk)));

  const data: T[] = [];
  for (const result of results) {
    if (result.error) return { data: [], error: result.error };
    if (result.data) data.push(...result.data);
  }
  return { data, error: null };
}

export function numberParam(value: string | string[] | undefined, fallback: number) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function stringParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed || undefined;
}
