import { execFileSync } from "node:child_process";

/** LLM diff verifier: did the change make all expected edits and nothing unexpected? */
export function runVerifier(opts: {
  expected: string;
  mustNotChange?: string;
  diff: string;
  model?: string;
}): { pass: boolean; reason: string } {
  const prompt = `You are verifying the result of an automated code change in a test.

EXPECTED CHANGES (what the change SHOULD have done):
${opts.expected}
${opts.mustNotChange ? `\nMUST NOT CHANGE:\n${opts.mustNotChange}` : ""}

DIFF (old -> new):
${opts.diff || "(no differences)"}

Decide:
1) Were ALL the expected changes made?
2) Were any UNEXPECTED changes made (changes not implied by the expected list)?

Reply with EXACTLY ONE JSON object and nothing else:
{"allExpectedMade": true|false, "unexpectedChanges": true|false, "reason": "<one short sentence>"}`;

  let raw: string;
  try {
    raw = execFileSync(
      "claude",
      ["-p", "--model", opts.model ?? "haiku", "--output-format", "json"],
      { input: prompt, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
    );
  } catch {
    return { pass: false, reason: "verifier model call failed" };
  }
  let text = "";
  try {
    text = JSON.parse(raw).result ?? "";
  } catch {
    return { pass: false, reason: "verifier output not JSON" };
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  let v: any = {};
  try {
    v = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { pass: false, reason: "verifier verdict unparseable" };
  }
  const pass = v.allExpectedMade === true && v.unexpectedChanges === false;
  return { pass, reason: String(v.reason ?? "no reason given") };
}
