import { execSync } from "node:child_process";
import { join } from "node:path";
import type { Assertion, AssertionResult, InteractionResult } from "./types.ts";
import { runVerifier } from "./verifier.ts";

export function runAssertion(
  a: Assertion,
  ctx: { workDir: string; interaction: InteractionResult }
): AssertionResult {
  switch (a.type) {
    case "command": {
      const cwd = join(ctx.workDir, a.in === "root" ? "." : "new");
      const expectExit = a.expectExit ?? 0;
      try {
        execSync(a.run, { cwd, stdio: "pipe" });
        return {
          assertion: `command: ${a.run}`,
          passed: expectExit === 0,
          detail: "exit 0",
        };
      } catch (e: any) {
        const code = typeof e.status === "number" ? e.status : 1;
        return {
          assertion: `command: ${a.run}`,
          passed: code === expectExit,
          detail: `exit ${code}`,
        };
      }
    }
    case "interaction": {
      const notes: string[] = [];
      let passed = true;
      if (a.expectNoMatch !== undefined && a.expectNoMatch !== ctx.interaction.noMatch) {
        passed = false;
        notes.push(`expected noMatch=${a.expectNoMatch}, got ${ctx.interaction.noMatch}`);
      }
      if (a.mustContain && !ctx.interaction.transcript.includes(a.mustContain)) {
        passed = false;
        notes.push(`transcript missing "${a.mustContain}"`);
      }
      return { assertion: "interaction", passed, detail: notes.join("; ") || "ok" };
    }
    case "verifier": {
      const oldDir = join(ctx.workDir, "old");
      const newDir = join(ctx.workDir, "new");
      const diff = dirDiff(oldDir, newDir);
      const v = runVerifier({ expected: a.expected, mustNotChange: a.mustNotChange, diff });
      return { assertion: "verifier", passed: v.pass, detail: v.reason };
    }
  }
}

function dirDiff(oldDir: string, newDir: string): string {
  try {
    return execSync(
      `diff -ru --exclude=node_modules --exclude=.git --exclude=.claude "${oldDir}" "${newDir}"`,
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
    );
  } catch (e: any) {
    // diff exits 1 when differences are found; the diff text is on stdout.
    return e.stdout ?? "";
  }
}
