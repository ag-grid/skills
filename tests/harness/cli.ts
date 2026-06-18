import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { runTest } from "./run-test.ts";
import { report } from "./report.ts";
import type { RunResult, TestDefinition } from "./types.ts";

const CASES_DIR = join(import.meta.dirname, "cases");

function listCases(): string[] {
  return readdirSync(CASES_DIR).filter((n) => {
    try {
      return statSync(join(CASES_DIR, n)).isDirectory();
    } catch {
      return false;
    }
  });
}

async function loadCase(name: string): Promise<TestDefinition> {
  const mod = await import(join(CASES_DIR, name, "test.ts"));
  return mod.default as TestDefinition;
}

async function main() {
  // Positional args are case names to run; with none, run every case.
  const { positionals } = parseArgs({ allowPositionals: true });
  const names = positionals.length > 0 ? positionals : listCases();

  const results: RunResult[] = [];
  for (const name of names) {
    const def = await loadCase(name);
    report.caseStart(name, def.model ?? "sonnet");
    const r = await runTest(def);
    results.push(r);
    for (const a of r.assertionResults) {
      report.assertion(a.passed, a.assertion, a.detail ?? "");
    }
    report.verdict(
      r.passed,
      r.expectOutcome,
      `answers=${r.interaction.answersSent}, noMatch=${r.interaction.noMatch}, timedOut=${r.interaction.timedOut}`
    );
    report.info(`log: ${r.logPath}`);
  }

  const passed = results.filter((r) => r.passed).length;
  report.summary(passed, results.length);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
