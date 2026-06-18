import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "single-question",
  prompt: "Run the single-question skill.",
  answers: [{ when: "asked for the user's name", reply: "Ada Lovelace" }],
  assertions: [
    { type: "interaction", maxAnswers: 1, mustContain: "Ada Lovelace", expectNoMatch: false },
  ],
  expectOutcome: "pass",
};

export default def;
