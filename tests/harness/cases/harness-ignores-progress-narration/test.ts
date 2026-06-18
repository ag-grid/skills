import type { TestDefinition } from "../../types.ts";

// The progress lines are user-facing but are not questions; the simulator must
// "wait" through them and only answer the real question.
const def: TestDefinition = {
  name: "harness-ignores-progress-narration",
  prompt: "Run the narrate-then-ask skill.",
  answers: [{ when: "asked for the user's name", reply: "Ada Lovelace" }],
  assertions: [{ type: "interaction", expectNoMatch: false, mustContain: "Ada Lovelace" }],
  expectOutcome: "pass",
};

export default def;
