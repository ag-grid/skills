import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
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

  // Install the skill into project-scoped .claude/skills so Claude Code discovers it.
  // Embedded skills live in the case folder alongside test.ts (which we must not copy).
  // Install under the skill's own frontmatter name, not the (harness-prefixed) folder name.
  const skillSrc = def.skill ? join(REPO, def.skill) : caseDir;
  cpSync(skillSrc, join(workDir, ".claude/skills", skillFolderName(skillSrc)), {
    recursive: true,
    filter: (src) => basename(src) !== "test.ts",
  });

  if (def.setup) await def.setup(workDir);

  const logPath = join(REPO, "tests/results", `${def.name}.jsonl`);
  const log = new JsonlLog(logPath);
  log.write({ event: "start", name: def.name, skill: def.skill, prompt: def.prompt });

  const interaction = await runAgentSession({
    prompt: def.prompt,
    cwd: workDir,
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
  const passed = expectOutcome === "pass" ? actualPass : !actualPass;

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

/** A skill installs under its SKILL.md frontmatter `name`, not its (possibly prefixed) folder. */
function skillFolderName(dir: string): string {
  try {
    const m = readFileSync(join(dir, "SKILL.md"), "utf8").match(/^name:\s*(.+)$/m);
    if (m) return m[1].trim();
  } catch {}
  return basename(dir);
}
