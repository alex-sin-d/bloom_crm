import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

export interface LocalDatabaseTarget {
  databaseUrl: string;
  redactedDatabaseUrl: string;
  dockerContainer: string;
}

export interface SqlExecutionResult {
  stdout: string;
  stderr: string;
}

const DEFAULT_LOCAL_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const DEFAULT_SUPABASE_DB_CONTAINER = "supabase_db_bloom_crm";

export function resolveLocalDatabaseTarget(
  databaseUrl = process.env.BLOOM_IMPORT_DATABASE_URL ?? process.env.DATABASE_URL ?? DEFAULT_LOCAL_DATABASE_URL,
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
