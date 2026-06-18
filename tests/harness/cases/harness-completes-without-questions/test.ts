import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "harness-completes-without-questions",
  prompt: "Run the state-a-fact skill.",
  answers: [],
  assertions: [{ type: "interaction", expectNoMatch: false, mustContain: "Done" }],
  expectOutcome: "pass",
};

export default def;
