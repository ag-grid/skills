import type { TestDefinition } from "../../types.ts";

// The skill asks a question with NO matching answer-map entry (the map is empty),
// so the simulator must return no_match and the run must (correctly) fail.
const def: TestDefinition = {
  name: "harness-unmapped-question-fails",
  prompt: "Run the ask-colour skill.",
  answers: [],
  assertions: [{ type: "interaction", expectNoMatch: true }],
  expectOutcome: "fail",
};

export default def;
