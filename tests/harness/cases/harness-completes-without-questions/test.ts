import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "harness-completes-without-questions",
  prompt: "Run the state-a-fact skill.",
  answers: [],
  expectOutcome: "pass",
};

export default def;
