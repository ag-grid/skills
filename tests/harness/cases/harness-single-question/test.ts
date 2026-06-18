import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "harness-single-question",
  prompt: "Run the single-question skill.",
  answers: [{ when: "asked for the user's name", reply: "Ada Lovelace" }],
  expectOutcome: "pass",
};

export default def;
