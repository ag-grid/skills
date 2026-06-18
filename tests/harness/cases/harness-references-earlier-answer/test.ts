import type { TestDefinition } from "../../types.ts";

// The second question references the first answer; exercises the simulator being
// given the full conversation so it can answer the follow-up in context.
const def: TestDefinition = {
  name: "harness-references-earlier-answer",
  prompt: "Run the name-then-city skill.",
  answers: [
    { when: "asked for the user's name", reply: "Ada Lovelace" },
    { when: "asked which city the user lives in", reply: "London" },
  ],
  assertions: [{ type: "interaction", expectNoMatch: false, mustContain: "London" }],
  expectOutcome: "pass",
};

export default def;
