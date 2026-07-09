import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface LocalDatabaseTarget {
  databaseUrl: string;
  redactedDatabaseUrl: string;
  dockerContainer: string;
}

export interface ImportDatabaseTarget extends LocalDatabaseTarget {
  expectedProjectRef: string | null;
  isLocal: boolean;
  projectRef: string | null;
}

export interface SqlExecutionResult {
  stdout: string;
  stderr: string;
}

const DEFAULT_LOCAL_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const DEFAULT_SUPABASE_DB_CONTAINER = "supabase_db_bloom_crm";

export function resolveLocalDatabaseTarget(
  databaseUrl =
    envValue("BLOOM_IMPORT_DATABASE_URL") ??
    envValue("DATABASE_URL") ??
    DEFAULT_LOCAL_DATABASE_URL,
): LocalDatabaseTarget {
  if (!isLocalDatabaseUrl(databaseUrl)) {
    throw new Error("Refusing non-local database target. Use localhost or 127.0.0.1 only.");
  }

  return {
    databaseUrl,
    redactedDatabaseUrl: redactDatabaseUrl(databaseUrl),
    dockerContainer: process.env.BLOOM_IMPORT_DB_CONTAINER ?? DEFAULT_SUPABASE_DB_CONTAINER,
  };
}

export function resolveImportDatabaseTarget(
  databaseUrl =
    envValue("BLOOM_IMPORT_DATABASE_URL") ??
    envValue("DATABASE_URL") ??
    envValue("TARGET_DATABASE_URL") ??
    DEFAULT_LOCAL_DATABASE_URL,
): ImportDatabaseTarget {
  const isLocal = isLocalDatabaseUrl(databaseUrl);
  const expectedProjectRef = resolveExpectedSupabaseProjectRef();
  const projectRef = inferSupabaseProjectRefFromDatabaseUrl(databaseUrl);

  if (!isLocal) {
    if (envValue("BLOOM_IMPORT_ALLOW_REMOTE") !== "1") {
      throw new Error(
        "Refusing remote database target. Set BLOOM_IMPORT_ALLOW_REMOTE=1 after confirming this is the CRM database.",
      );
    }
    if (!expectedProjectRef) {
      throw new Error(
        "Refusing remote database target because the app Supabase project ref could not be determined.",
      );
    }
    if (!projectRef) {
      throw new Error(
        "Refusing remote database target because the database URL does not expose a Supabase project ref.",
      );
    }
    if (projectRef !== expectedProjectRef) {
      throw new Error(
        `Refusing remote database target for project ${projectRef}; app is configured for ${expectedProjectRef}.`,
      );
    }
  }

  return {
    databaseUrl,
    redactedDatabaseUrl: redactDatabaseUrl(databaseUrl),
    dockerContainer: envValue("BLOOM_IMPORT_DB_CONTAINER") ?? DEFAULT_SUPABASE_DB_CONTAINER,
    expectedProjectRef,
    isLocal,
    projectRef,
  };
}

export function isLocalDatabaseUrl(databaseUrl: string): boolean {
  try {
    const parsed = new URL(databaseUrl);
    return parsed.protocol.startsWith("postgres") &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

export function redactDatabaseUrl(databaseUrl: string): string {
  try {
    const parsed = new URL(databaseUrl);
    if (parsed.password) {
      parsed.password = "REDACTED";
    }
    if (parsed.username) {
      parsed.username = parsed.username === "postgres" ? "postgres" : "REDACTED";
    }
    return parsed.toString();
  } catch {
    return "[invalid database url]";
  }
}

export async function runLocalSql(
  sql: string,
  target = resolveLocalDatabaseTarget(),
): Promise<SqlExecutionResult> {
  return runProcess(
    resolveDockerCommand(),
    [
      "exec",
      "-i",
      target.dockerContainer,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
    ],
    sql,
  );
}

export async function runLocalSqlJson<T>(
  sql: string,
  target = resolveLocalDatabaseTarget(),
): Promise<T> {
  const result = await runLocalSql(sql, target);
  const trimmed = result.stdout.trim();
  const lastLine = trimmed.split("\n").filter(Boolean).at(-1);
  if (!lastLine) {
    throw new Error("SQL command did not return JSON output");
  }

  const parsed = JSON.parse(lastLine) as T | { rows?: Array<Record<string, string>> };
  if (isQueryEnvelope(parsed)) {
    const firstRow = parsed.rows?.[0];
    const firstValue = firstRow ? Object.values(firstRow)[0] : undefined;
    if (!firstValue) {
      throw new Error("SQL command did not return a JSON value");
    }
    return JSON.parse(firstValue) as T;
  }
  return parsed as T;
}

function runProcess(
  command: string,
  args: readonly string[],
  stdin: string,
): Promise<SqlExecutionResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`SQL command failed with exit code ${code}: ${stderr.trim()}`));
      }
    });
    child.stdin.end(stdin);
  });
}

function resolveDockerCommand(): string {
  for (const candidate of [
    "/usr/local/bin/docker",
    "/Applications/Docker.app/Contents/Resources/bin/docker",
    "docker",
  ]) {
    if (candidate === "docker" || existsSync(candidate)) {
      return candidate;
    }
  }
  return "docker";
}

function isQueryEnvelope(value: unknown): value is { rows?: Array<Record<string, string>> } {
  return Boolean(value && typeof value === "object" && "rows" in value);
}

let fileEnvCache: Record<string, string> | null = null;

function envValue(name: string): string | undefined {
  const value = process.env[name] ?? loadFileEnv()[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function loadFileEnv(): Record<string, string> {
  if (fileEnvCache) return fileEnvCache;

  const values: Record<string, string> = {};
  for (const fileName of [".env", ".env.local"]) {
    const filePath = path.join(process.cwd(), fileName);
    if (!existsSync(filePath)) continue;
    const raw = readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (parsed) values[parsed.key] = parsed.value;
    }
  }

  fileEnvCache = values;
  return values;
}

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const equalsIndex = trimmed.indexOf("=");
  if (equalsIndex < 0) return null;

  const key = trimmed.slice(0, equalsIndex).replace(/^export\s+/, "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;

  let value = trimmed.slice(equalsIndex + 1).trim();
  const quote = value[0];
  if ((quote === "\"" || quote === "'") && value.endsWith(quote)) {
    value = value.slice(1, -1);
  } else {
    const commentIndex = value.search(/\s#/);
    if (commentIndex >= 0) value = value.slice(0, commentIndex).trim();
  }

  return { key, value };
}

function resolveExpectedSupabaseProjectRef(): string | null {
  const refs = uniqueValues([
    inferSupabaseProjectRefFromUrl(envValue("NEXT_PUBLIC_SUPABASE_URL")),
    inferSupabaseProjectRefFromUrl(envValue("SUPABASE_URL")),
    readLinkedProjectRef(),
  ]);

  if (refs.length > 1) {
    throw new Error(`Supabase project ref mismatch in local configuration: ${refs.join(", ")}.`);
  }

  return refs[0] ?? null;
}

function inferSupabaseProjectRefFromUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const match = parsed.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function inferSupabaseProjectRefFromDatabaseUrl(databaseUrl: string): string | null {
  try {
    const parsed = new URL(databaseUrl);
    const usernameMatch = decodeURIComponent(parsed.username).match(/^postgres\.([a-z0-9]{20})$/i);
    if (usernameMatch?.[1]) return usernameMatch[1];

    const directHostMatch = parsed.hostname.match(/^db\.([a-z0-9]{20})\.supabase\.co$/i);
    if (directHostMatch?.[1]) return directHostMatch[1];

    return null;
  } catch {
    return null;
  }
}

function readLinkedProjectRef(): string | null {
  const filePath = path.join(process.cwd(), "supabase", ".temp", "project-ref");
  if (!existsSync(filePath)) return null;
  const value = readFileSync(filePath, "utf8").trim();
  return value || null;
}

function uniqueValues(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}
