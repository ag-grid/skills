import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "harness-multiple-questions-in-order",
  prompt: "Run the ask-three-questions skill.",
  answers: [
    { when: "asked for the user's name", reply: "Ada Lovelace" },
    { when: "asked for the user's favourite colour", reply: "blue" },
    { when: "asked which city the user lives in", reply: "London" },
  ],
  expectOutcome: "pass",
};

export default def;
