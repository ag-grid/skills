import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "harness-multi-part-answer",
  prompt: "Run the ask-contact skill.",
  answers: [
    {
      when: "asked for the user's full name and email address",
      reply: "Ada Lovelace, ada@example.com",
    },
  ],
  assertions: [{ type: "interaction", expectNoMatch: false, mustContain: "ada@example.com" }],
  expectOutcome: "pass",
};

export default def;
