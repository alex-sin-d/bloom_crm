import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "..", "..", ".frontend-test-dist");

function resolveAlias(specifier) {
  const rel = specifier.slice(2);
  const base = path.join(outDir, rel);
  const candidates = [`${base}.js`, path.join(base, "index.js"), base];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const url = resolveAlias(specifier);
    if (url) return { url, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
