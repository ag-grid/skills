import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { runTest } from "./run-test.ts";
import { Reporter, narrate, summary } from "./report.ts";
import type { RunResult, TestDefinition } from "./types.ts";

const CASES_DIR = join(import.meta.dirname, "cases");
const STAGGER_MS = 1000;
const DEFAULT_PARALLEL = 16;

function allCaseDirs(): string[] {
  return readdirSync(CASES_DIR)
    .map((n) => join(CASES_DIR, n))
    .filter((p) => {
      try {
        return statSync(p).isDirectory();
      } catch {
        return false;
      }
    });
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function loadDef(caseDir: string): Promise<TestDefinition> {
  return (await import(join(caseDir, "test.ts"))).default as TestDefinition;
}

/** Run one case with the given reporter, emit its assertion lines + verdict. */
async function runOne(caseDir: string, reporter: Reporter): Promise<RunResult> {
  const def = await loadDef(caseDir);
  reporter.caseStart(def.name, def.model ?? "sonnet");
  const r = await runTest(def, caseDir, reporter);
  for (const a of r.assertionResults) reporter.assertion(a.passed, a.assertion, a.detail ?? "");
  reporter.verdict(
    def.name,
    r.passed,
    r.expectFail ?? "pass",
    `failures=[${r.failures.join(",")}], answers=${r.interaction.answersSent}, ` +
      `noMatch=${r.interaction.noMatch}, unanswered=${r.interaction.unanswered.length}, ` +
      `timedOut=${r.interaction.timedOut}`,
  );
  reporter.info(`log: ${r.logPath}`);
  return r;
}

async function runSequential(caseDirs: string[]): Promise<RunResult[]> {
  const results: RunResult[] = [];
  for (const caseDir of caseDirs) {
    results.push(await runOne(caseDir, new Reporter(true)));
  }
  return results;
}

async function runParallel(caseDirs: string[], limit: number): Promise<RunResult[]> {
  narrate(`Running tests in parallel (up to ${limit} at once)`);
  const results: RunResult[] = [];
  const running = new Set<Promise<void>>();
  for (const caseDir of caseDirs) {
    while (running.size >= limit) await Promise.race(running);
    const def = await loadDef(caseDir);
    narrate(`Starting test case ${def.name}`);
    const reporter = new Reporter(false); // buffered; printed atomically on completion
    const p = (async () => {
      const r = await runOne(caseDir, reporter);
      reporter.flush();
      results.push(r);
    })().finally(() => running.delete(p));
    running.add(p);
    await delay(STAGGER_MS); // stagger starts so we don't fire everything at once
  }
  await Promise.all(running);
  return results;
}

function parseArgs(argv: string[]): { caseDirs: string[]; parallel: number } {
  const positionals: string[] = [];
  let parallel = 0; // 0 = sequential
  for (const a of argv) {
    if (a === "--parallel") parallel = DEFAULT_PARALLEL;
    else if (a.startsWith("--parallel=")) {
      const n = parseInt(a.slice("--parallel=".length), 10);
      parallel = Number.isFinite(n) && n > 0 ? n : DEFAULT_PARALLEL;
    } else if (!a.startsWith("-")) {
      positionals.push(resolve(process.cwd(), a));
    }
  }
  return { caseDirs: positionals.length > 0 ? positionals : allCaseDirs(), parallel };
}

async function main() {
  const { caseDirs, parallel } = parseArgs(process.argv.slice(2));
  const results = parallel > 0 ? await runParallel(caseDirs, parallel) : await runSequential(caseDirs);
  summary(results);
  const allPassed = results.every((r) => r.passed);
  process.exit(allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
