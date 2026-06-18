import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { basename, join, resolve } from "node:path";
import { runAgentSession } from "./driver.ts";
import { runAssertion } from "./assertions.ts";
import { JsonlLog } from "./log.ts";
import type { Reporter } from "./report.ts";
import type { RunResult, TestDefinition } from "./types.ts";

// This file is tests/harness/; repo root is two levels up. work/results/fixtures live under tests/.
const REPO = resolve(import.meta.dirname, "../..");

export async function runTest(
  def: TestDefinition,
  caseDir: string,
  reporter: Reporter,
): Promise<RunResult> {
  const workDir = join(REPO, "tests/work", def.name);
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });

  // If the case ships a fixture/ folder (a sample workspace), copy it to old/ and new/.
  // Omit it for cases that don't exercise a diff (e.g. pure interaction tests).
  const fixtureDir = join(caseDir, "fixture");
  if (existsSync(fixtureDir)) {
    for (const sub of ["old", "new"]) {
      cpSync(fixtureDir, join(workDir, sub), { recursive: true });
    }
  }

  // Where the agent runs: the project dir (new/) for real-skill cases, else the work dir.
  const cwd = def.runIn === "new" ? join(workDir, "new") : workDir;
  mkdirSync(cwd, { recursive: true });

  // Install skills into project-scoped .claude/skills (under cwd) so Claude Code discovers them.
  // The skill name is the directory name (no parsing): a referenced skill installs as
  // .claude/skills/<basename>; an embedded case mirrors .claude/skills in its own skills/ folder,
  // whose contents (skills/<name>/SKILL.md) are copied in directly.
  const skillsDest = join(cwd, ".claude/skills");
  if (def.skill) {
    cpSync(join(REPO, def.skill), join(skillsDest, basename(def.skill)), { recursive: true });
  } else {
    cpSync(join(caseDir, "skills"), skillsDest, { recursive: true });
  }

  // Real-skill cases run in a git repo so the skill's per-step commits work. Ignore .claude and
  // node_modules so they pollute neither the skill's commits nor the old/new diff.
  if (def.runIn === "new") {
    // Write the same .gitignore into old/ and new/ so it is diff-neutral; git only inits new/.
    const gitignore = "node_modules\n.claude/\n";
    writeFileSync(join(workDir, "old", ".gitignore"), gitignore);
    writeFileSync(join(cwd, ".gitignore"), gitignore);
    execSync(
      "git init -q && git add -A && " +
        'git -c user.email=harness@test -c user.name=harness commit -q -m baseline',
      { cwd, stdio: "pipe" },
    );
  }

  const logPath = join(REPO, "tests/results", `${def.name}.jsonl`);
  const log = new JsonlLog(logPath);
  log.write({ event: "start", name: def.name, skill: def.skill, prompt: def.prompt });

  const interaction = await runAgentSession({
    prompt: def.prompt,
    cwd,
    model: def.model,
    answers: def.answers,
    log,
    reporter,
  });
  log.write({
    event: "interaction",
    answersSent: interaction.answersSent,
    noMatch: interaction.noMatch,
    timedOut: interaction.timedOut,
    exitCode: interaction.exitCode,
  });

  const assertionResults = (def.assertions ?? []).map((a) => {
    const r = runAssertion(a, { workDir, interaction });
    log.write({ event: "assertion", ...r });
    return r;
  });

  const actualPass =
    !interaction.noMatch &&
    !interaction.timedOut &&
    interaction.unanswered.length === 0 &&
    assertionResults.every((r) => r.passed);
  const expectOutcome = def.expectOutcome ?? "pass";
  // A timeout is never a legitimate outcome (even for expect-fail tests): it always fails, so a
  // hang can't masquerade as the failure an expect-fail test was looking for. Otherwise the run
  // passes when its actual outcome matches what the test expects.
  const passed = interaction.timedOut
    ? false
    : expectOutcome === "pass"
      ? actualPass
      : !actualPass;

  const result: RunResult = {
    name: def.name,
    passed,
    expectOutcome,
    assertionResults,
    interaction: {
      answersSent: interaction.answersSent,
      noMatch: interaction.noMatch,
      unanswered: interaction.unanswered,
      timedOut: interaction.timedOut,
      exitCode: interaction.exitCode,
      finalText: interaction.finalText,
    },
    logPath,
  };
  log.write({ event: "result", passed, expectOutcome });
  return result;
}
