import { execSync } from "node:child_process";
import { join } from "node:path";
import type { Assertion, AssertionResult, InteractionResult } from "./types.ts";
import { checkDiff } from "./check-diff.ts";

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
    case "check-diff": {
      const oldDir = join(ctx.workDir, "old");
      const newDir = join(ctx.workDir, "new");
      const diff = dirDiff(oldDir, newDir);
      const v = checkDiff({ expected: a.expected, diff });
      return { assertion: "check-diff", passed: v.pass, detail: v.reason };
    }
    case "transcript": {
      const passed = ctx.interaction.transcript.includes(a.includes);
      return {
        assertion: `transcript includes "${a.includes}"`,
        passed,
        detail: passed ? "found" : "not found in transcript",
      };
    }
  }
}

function dirDiff(oldDir: string, newDir: string): string {
  try {
    return execSync(
      `diff -ru --exclude=node_modules --exclude=.git --exclude=.claude --exclude=dist --exclude=build "${oldDir}" "${newDir}"`,
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
    );
  } catch (e: any) {
    // diff exits 1 when differences are found; the diff text is on stdout.
    return e.stdout ?? "";
  }
}
