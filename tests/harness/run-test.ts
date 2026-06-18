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

// Fragile mode: a test-only prompt prefix (not part of the shipped skill) that makes the agent
// fail fast and loud on skill-level confusion, so wording gaps surface instead of being guessed
// past. Detected via the FRAGILE-ABORT sentinel, which forces a fail.
const FRAGILE_PREAMBLE = `FRAGILE MODE (automated test). Follow the skill's instructions exactly. If at any point it is not exactly clear what to do - for example an instruction is ambiguous, or you are given contradictory information or a reference to something that does not exist, or you would otherwise have to GUESS or improvise to continue — do not guess and do not work around it. Stop immediately, output one line "FRAGILE-ABORT: <one sentence on exactly what confused or blocked you, quoting the skill instruction>", and end your turn.
This does NOT apply to: (a) asking the user the questions the skill tells you to ask — do those normally; (b) handling breaking changes/migrations the skill is designed for — that is expected work; (c) a documented decision to refuse or stop (e.g. an unsupported version range) — that is a correct outcome, report it normally, not as a FRAGILE-ABORT.`;

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
  const hasFixture = existsSync(fixtureDir);
  if (hasFixture) {
    for (const sub of ["old", "new"]) {
      cpSync(fixtureDir, join(workDir, sub), { recursive: true });
    }
  }

  // Run in the project dir (new/) whenever the case ships a fixture; otherwise the work dir.
  const cwd = hasFixture ? join(workDir, "new") : workDir;
  mkdirSync(cwd, { recursive: true });

  // Install skills into project-scoped .claude/skills (under cwd) so Claude Code discovers them.
  // The skill name is the directory name (no parsing): a referenced skill installs as
  // .claude/skills/<basename>; an embedded case mirrors .claude/skills in its own skills/ folder,
  // whose contents (skills/<name>/SKILL.md) are copied in directly.
  const skillsDest = join(cwd, ".claude/skills");
  if (def.skill) {
    cpSync(join(REPO, def.skill), join(skillsDest, basename(def.skill)), {
      recursive: true,
    });
  } else {
    cpSync(join(caseDir, "skills"), skillsDest, { recursive: true });
  }

  // Real-skill cases run in a git repo so the skill's per-step commits work. Ignore .claude and
  // node_modules so they pollute neither the skill's commits nor the old/new diff.
  if (hasFixture) {
    // Write the same .gitignore into old/ and new/ so it is diff-neutral; git only inits new/.
    const gitignore = "node_modules\n.claude/\n";
    writeFileSync(join(workDir, "old", ".gitignore"), gitignore);
    writeFileSync(join(cwd, ".gitignore"), gitignore);
    execSync(
      "git init -q && git add -A && " +
        "git -c user.email=harness@test -c user.name=harness commit -q -m baseline",
      { cwd, stdio: "pipe" },
    );
  }

  const logPath = join(REPO, "tests/results", `${def.name}.jsonl`);
  const log = new JsonlLog(logPath);
  log.write({
    event: "start",
    name: def.name,
    skill: def.skill,
    prompt: def.prompt,
  });

  // Fragile mode (prompt-injected; not part of the shipped skill). Default on for real-skill
  // cases (those with a `skill`), off for harness cases — override per-test with `fragile`.
  const fragile = def.fragile ?? Boolean(def.skill);
  const prompt = fragile ? `${FRAGILE_PREAMBLE}\n\n${def.prompt}` : def.prompt;

  const interaction = await runAgentSession({
    prompt,
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

  // A FRAGILE-ABORT means the agent hit skill-level confusion; surface the reason.
  const fragileAbort = interaction.transcript.match(/FRAGILE-ABORT:[^\n]*/)?.[0] ?? null;
  if (fragileAbort) reporter.sim(fragileAbort, true);

  const expectOutcome = def.expectOutcome ?? "pass";
  let passed: boolean;
  if (def.expectFragileAbort) {
    // Meta-test of fragile mode itself: success == the agent produced a FRAGILE-ABORT.
    passed = Boolean(fragileAbort) && !interaction.timedOut;
  } else {
    const actualPass =
      !interaction.noMatch &&
      !interaction.timedOut &&
      !fragileAbort &&
      interaction.unanswered.length === 0 &&
      assertionResults.every((r) => r.passed);
    // A timeout never counts as the expected outcome (even for expect-fail), so it always fails.
    passed = interaction.timedOut ? false : expectOutcome === "pass" ? actualPass : !actualPass;
  }

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
  log.write({ event: "result", passed, expectOutcome, fragileAbort });
  return result;
}
