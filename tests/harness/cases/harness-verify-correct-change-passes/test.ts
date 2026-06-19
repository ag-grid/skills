import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "harness-verify-correct-change-passes",
  prompt: "Run the set-value-to-2 skill.",
  answers: [],
  assertions: [
    { type: "command", run: "node --check app.mjs" },
    {
      type: "check-diff",
      expected: "In app.mjs, the exported `value` constant changed from 1 to 2. Nothing else.",
    },
  ],
};

export default def;
