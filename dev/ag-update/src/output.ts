/** The standard output format: a status line, body paragraphs and trailing NOTICE messages. */

export type Status = "SUCCESS" | "ERROR";

export interface ScriptOutput {
  status: Status;
  /** Rendered as the first line: "{status}: {statusLine}" */
  statusLine: string;
  /** Body paragraphs, rendered separated by blank lines */
  body: string[];
  /** Collected NOTICE messages, rendered last, each prefixed "NOTICE: " */
  notices: string[];
  /** Resolved output folder (--output-folder or the mkdtemp default); the wrapper joins
   *  reportFiles names to this when writing. */
  outputFolder: string;
  /** Files to write, file name -> content (names, not paths, so tests can assert them
   *  directly): the per-project reports plus, on SUCCESS, summary.md (the verbatim rendered
   *  output). Like stderr, the stages don't write — the outer bin wrapper joins each name to
   *  outputFolder and writes; integration tests assert on this value. Empty on ERROR. */
  reportFiles: Record<string, string>;
}

/** Module-level NOTICE collector. Outputs hold this array by reference, so notices added at
 *  any point during a run appear in whatever output the run eventually produces. */
const notices: string[] = [];

/** Append a NOTICE to whatever output the run eventually produces (success or error). */
export function addNotice(message: string): void {
  notices.push(message);
}

/** Clears the notice collector; test-only, called via globalTestStateReset. */
export function resetNotices(): void {
  notices.length = 0;
}

/** Construct the single success outcome. */
export function succeed(
  statusLine: string,
  body: string[],
  outputFolder: string,
  reportFiles: Record<string, string>,
): ScriptOutput {
  return {
    status: "SUCCESS",
    statusLine,
    body,
    notices,
    outputFolder,
    reportFiles,
  };
}

/** Thrown from any stage to terminate with an ERROR output; caught once in main.ts. */
export class ExitWithError extends Error {
  readonly output: ScriptOutput;

  constructor(statusLine: string, body: string[]) {
    super(statusLine);
    this.name = "ExitWithError";
    this.output = {
      status: "ERROR",
      statusLine,
      body,
      notices,
      outputFolder: "",
      reportFiles: {},
    };
  }
}

/** Renders an error and its `cause` chain as "error caused by cause caused by ...", so the root
 *  cause (e.g. a TLS failure behind a generic "fetch failed") is surfaced. Errors render as
 *  "Name: message"; non-Error values via String(). Cycle-safe. */
export function stringifyError(error: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  for (
    let current = error;
    current != null && !seen.has(current);
    current = causeOf(current)
  ) {
    seen.add(current);
    parts.push(
      current instanceof Error
        ? `${current.name}: ${current.message}`
        : String(current),
    );
  }
  return parts.join(" caused by ");
}

function causeOf(error: unknown): unknown {
  return error instanceof Error ? error.cause : undefined;
}

/** Render to the standard format. Called exactly once, in main.ts, which writes the
 *  result to stderr and exits (SUCCESS -> 0, ERROR -> 1). */
export function render(output: ScriptOutput): string {
  const parts = [
    `${output.status}: ${output.statusLine}`,
    ...output.body,
    ...output.notices.map((notice) => `NOTICE: ${notice}`),
  ];
  return parts.join("\n\n") + "\n";
}
