import { styleText } from "node:util";
import type { RunResult } from "./types.ts";

// Per-run reporter. In "live" mode it writes through immediately (sequential runs);
// in "buffered" mode it accumulates lines and prints them atomically on flush(), so
// concurrent parallel runs don't interleave their output.
export class Reporter {
  private buf: string[] = [];
  private live: boolean;
  constructor(live: boolean) {
    this.live = live;
  }

  private out(s: string): void {
    if (this.live) process.stdout.write(s + "\n");
    else this.buf.push(s);
  }

  flush(): void {
    if (!this.live && this.buf.length > 0) {
      process.stdout.write(this.buf.join("\n") + "\n");
    }
    this.buf = [];
  }

  caseStart(name: string, model: string): void {
    this.out("\n" + styleText(["bold", "inverse"], ` ${name} `) + styleText("dim", `  model: ${model}`));
  }
  user(text: string): void {
    this.out(styleText(["bold", "green"], "User:") + " " + text);
  }
  agent(text: string): void {
    this.out(styleText(["bold", "cyan"], "Agent:") + " " + text);
  }
  tool(summary: string): void {
    this.out(styleText("dim", `  [tool: ${summary}]`));
  }
  sim(note: string, bad = false): void {
    this.out(styleText(bad ? ["bold", "red"] : "dim", `  · ${note}`));
  }
  info(text: string): void {
    this.out(styleText("dim", `  ${text}`));
  }
  assertion(ok: boolean, label: string, detail: string): void {
    const tag = ok ? styleText("green", "ok ") : styleText(["bold", "red"], "BAD");
    this.out(`  ${tag} ${label} ${styleText("dim", `:: ${detail}`)}`);
  }
  verdict(name: string, passed: boolean, expect: string, extra: string): void {
    const v = passed
      ? styleText(["bold", "green"], "PASS")
      : styleText(["bold", "red"], "FAIL");
    this.out(`${v} ${styleText("bold", name)} ${styleText("dim", `(expect ${expect}; ${extra})`)}`);
  }
}

/** cli-level narration, always printed immediately (even in parallel mode). */
export function narrate(text: string): void {
  process.stdout.write(styleText("bold", text) + "\n");
}

/** End-of-run roster: one line per case (pass/fail), then the total. Always printed. */
export function summary(results: RunResult[]): void {
  const sorted = [...results].sort((a, b) => a.name.localeCompare(b.name));
  process.stdout.write("\n" + styleText(["bold", "inverse"], " summary ") + "\n");
  for (const r of sorted) {
    const tag = r.passed ? styleText("green", "PASS") : styleText(["bold", "red"], "FAIL");
    process.stdout.write(`  ${tag}  ${r.name}\n`);
  }
  const passed = results.filter((r) => r.passed).length;
  process.stdout.write(
    "\n" + styleText(["bold", passed === results.length ? "green" : "red"], `${passed}/${results.length} passed`) + "\n",
  );
}
