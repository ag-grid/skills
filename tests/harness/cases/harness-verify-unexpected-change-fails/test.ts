import type { TestDefinition } from "../../types.ts";

// The skill makes the expected change PLUS a valid extra export. `node --check`
// passes (valid JS), so only check-diff can catch the unexpected change — the run
// must (correctly) fail.
const def: TestDefinition = {
  name: "harness-verify-unexpected-change-fails",
  prompt: "Run the set-value-and-add-extra skill.",
  answers: [],
  assertions: [
    { type: "command", run: "node --check app.mjs" },
    {
      type: "check-diff",
      expected: "In app.mjs, the exported `value` constant changed from 1 to 2. Nothing else.",
    },
  ],
  expectFail: "diff_mismatch",
};

export default def;
