import type { TestDefinition } from "../../types.ts";

// The skill writes invalid JS, so the `node --check` command oracle must fail and
// the run must (correctly) fail.
const def: TestDefinition = {
  name: "harness-verify-syntax-error-fails",
  prompt: "Run the write-broken-value skill.",
  answers: [],
  assertions: [{ type: "command", run: "node --check app.mjs" }],
  expectFail: "command",
};

export default def;
