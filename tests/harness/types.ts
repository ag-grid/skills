// Light abstraction for an agentic test. One definition drives one run of the real
// `claude` CLI against a skill, with a fast model simulating the user.

export interface AnswerEntry {
  /** Natural-language description of the question the user might be asked. */
  when: string;
  /** The reply to give when that question is asked. */
  reply: string;
  /** If true, the run does NOT fail when this question is never asked (the skill may legitimately
   *  skip it, e.g. scope confirmation for a single-package app). Required answers must be asked. */
  optional?: boolean;
}

// Interaction mechanics (questions asked/answered, no_match, timeout) are checked intrinsically
// by the runner, so assertions only cover post-run outcomes: a command exit code or a diff verdict.
export type Assertion =
  // Run a shell command in work/<case>/new (or root); pass on the expected exit code.
  | { type: "command"; run: string; expectExit?: number; in?: "new" | "root" }
  // LLM diff check: does the diff contain exactly the expected change-set (all of it, nothing
  // material beyond it)? `expected` describes the complete intended set of changes.
  | { type: "check-diff"; expected: string }
  // The agent's user-facing transcript must include this string (e.g. a refusal or status message).
  | { type: "transcript"; includes: string };

export interface TestDefinition {
  name: string;
  /** Skill to install for this run, as a repo-root-relative path (e.g. "skills/ag-update").
   *  Omit to embed the skill in the case's own folder: tests/harness/cases/<name>/SKILL.md. */
  skill?: string;
  /** Initial human message sent to the agent. */
  prompt: string;
  /** The simulator answers questions only from this map. */
  answers: AnswerEntry[];
  assertions?: Assertion[];
  /** Whether the validations are expected to pass or to (correctly) fail. Default "pass". */
  expectOutcome?: "pass" | "fail";
  /** Fragile mode (real-skill cases): inject the fail-fast-on-confusion preamble. Default on for
   *  cases with a `skill`. Set false for a normal-mode fidelity run, true to opt a harness case in. */
  fragile?: boolean;
  /** Meta-test of fragile mode: the run passes iff the agent produced a FRAGILE-ABORT. */
  expectFragileAbort?: boolean;
  /** Under-test model. Default "sonnet". */
  model?: string;
}

export interface InteractionResult {
  answersSent: number;
  noMatch: boolean;
  /** `when` descriptions of answer-map entries that were never asked (a failure). */
  unanswered: string[];
  timedOut: boolean;
  exitCode: number | null;
  finalText: string;
  transcript: string;
}

export interface AssertionResult {
  assertion: string;
  passed: boolean;
  detail?: string;
}

export interface RunResult {
  name: string;
  /** Did the actual outcome match expectOutcome? */
  passed: boolean;
  expectOutcome: "pass" | "fail";
  assertionResults: AssertionResult[];
  interaction: Omit<InteractionResult, "transcript">;
  logPath: string;
}
