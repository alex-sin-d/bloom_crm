import { buildImportPlan } from "./plan.js";
import { dryRunSummary, printJson, validationSummary } from "./report.js";
import { validateSources } from "./validate.js";
import { resolveLocalDatabaseTarget } from "./db.js";
import { runLocalImport } from "./local-import.js";

type Mode = "validate" | "dry-run" | "import";

interface CliOptions {
  mode: Mode;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const validation = await validateSources();

  if (options.mode === "validate") {
    printJson(validationSummary(validation));
    process.exitCode = validation.ok ? 0 : 1;
    return;
  }

  if (!validation.ok) {
    printJson(validationSummary(validation));
    process.exitCode = 1;
    return;
  }

  const plan = await buildImportPlan(validation);

  if (options.mode === "dry-run") {
    printJson(dryRunSummary(plan));
    return;
  }

  const target = resolveLocalDatabaseTarget();
  const result = await runLocalImport(plan, target);
  printJson({
    status: "completed",
    database_target: target.redactedDatabaseUrl,
    totals: result,
  });
}

function parseArgs(args: string[]): CliOptions {
  const modeArg = args[0];
  if (modeArg === "validate") {
    return { mode: "validate" };
  }
  if (modeArg === "dry-run") {
    return { mode: "dry-run" };
  }
  if (modeArg === "import") {
    return { mode: "import" };
  }

  throw new Error(
    "Usage: importer <validate|dry-run|import>. Import mode refuses non-local database targets.",
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  printJson({
    status: "failed",
    error: redactForOutput(message),
  });
  process.exitCode = 1;
});

function redactForOutput(value: string): string {
  return value
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted database url]")
    .replace(/password=[^\s]+/gi, "password=[redacted]");
}
