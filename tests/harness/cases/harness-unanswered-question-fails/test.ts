import type { TestDefinition } from "../../types.ts";

// The map provides two answers but the skill only asks one. The unused "favourite
// colour" answer must make the run (correctly) fail — proving we detect a provided
// answer whose question is never asked.
const def: TestDefinition = {
  name: "harness-unanswered-question-fails",
  prompt: "Run the ask-name-only skill.",
  answers: [
    { when: "asked for the user's name", reply: "Ada Lovelace" },
    { when: "asked for the user's favourite colour", reply: "blue" },
  ],
  assertions: [],
  expectFail: "unanswered",
};

export default def;
