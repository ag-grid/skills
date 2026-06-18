import { styleText } from "node:util";

// Live, colored console output so a human can watch a run and debug in real time.
// Full structured detail still goes to the JSONL log; this is the human view.

function out(s: string): void {
  process.stdout.write(s + "\n");
}

export const report = {
  caseStart(name: string, model: string): void {
    out("\n" + styleText(["bold", "inverse"], ` ${name} `) + styleText("dim", `  model: ${model}`));
  },

  /** The human kickoff prompt and each simulated user answer. */
  user(text: string): void {
    out(styleText(["bold", "green"], "User:") + " " + text);
  },

  /** An assistant message shown to the user. */
  agent(text: string): void {
    out(styleText(["bold", "cyan"], "Agent:") + " " + text);
  },

  /** A tool call the agent made (e.g. running a command, editing a file). */
  tool(summary: string): void {
    out(styleText("dim", `  [tool: ${summary}]`));
  },

  /** A simulator decision (waiting / done / no-match). */
  sim(note: string, bad = false): void {
    out(styleText(bad ? ["bold", "red"] : "dim", `  · ${note}`));
  },

  info(text: string): void {
    out(styleText("dim", `  ${text}`));
  },

  assertion(ok: boolean, label: string, detail: string): void {
    const tag = ok ? styleText("green", "ok ") : styleText(["bold", "red"], "BAD");
    out(`  ${tag} ${label} ${styleText("dim", `:: ${detail}`)}`);
  },

  verdict(passed: boolean, expect: string, extra: string): void {
    const v = passed
      ? styleText(["bold", "green"], "PASS")
      : styleText(["bold", "red"], "FAIL");
    out(`${v} ${styleText("dim", `(expect ${expect}; ${extra})`)}`);
  },

  summary(passed: number, total: number): void {
    out("\n" + styleText(["bold", passed === total ? "green" : "red"], `${passed}/${total} passed`));
  },
};
