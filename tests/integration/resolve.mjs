// ESM resolve hook for the integration harness.
//
// The compiled loader modules import via the `@/` path alias (which Node cannot resolve at
// runtime) and pull in `next/headers` through the server Supabase factory. The integration
// tests always inject their own Supabase client, so `next/headers` is never actually called —
// we stub it so the modules import cleanly outside the Next.js runtime.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "..", "..", ".integration-test-dist");
const nextHeadersStub = pathToFileURL(path.join(here, "stubs", "next-headers.mjs")).href;

function resolveAlias(specifier) {
  const rel = specifier.slice(2); // drop "@/"
  const base = path.join(outDir, rel);
  const candidates = [`${base}.js`, path.join(base, "index.js"), base];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/headers") {
    return { url: nextHeadersStub, shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    const url = resolveAlias(specifier);
    if (url) return { url, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
