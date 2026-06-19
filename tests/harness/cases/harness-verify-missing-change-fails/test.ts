import type { TestDefinition } from "../../types.ts";

// The skill makes no change, so check-diff must report the expected change as
// missing and the run must (correctly) fail.
const def: TestDefinition = {
  name: "harness-verify-missing-change-fails",
  prompt: "Run the leave-files-unchanged skill.",
  answers: [],
  assertions: [
    {
      type: "check-diff",
      expected: "In app.mjs, the exported `value` constant changed from 1 to 2. Nothing else.",
    },
  ],
  expectFail: "diff_mismatch",
};

export default def;
