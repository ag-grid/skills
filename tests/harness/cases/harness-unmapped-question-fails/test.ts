import type { TestDefinition } from "../../types.ts";

// The skill asks a question with NO matching answer-map entry (the map is empty),
// so the simulator must return no_match and the run must (correctly) fail.
const def: TestDefinition = {
  name: "harness-unmapped-question-fails",
  prompt: "Run the ask-colour skill.",
  answers: [],
  // No assertions needed: the run fails intrinsically when the simulator hits no_match (and a
  // timeout, were no_match to break, also fails) — so this case stays protective of no_match.
  assertions: [],
  expectFail: "asked_unmapped_question",
};

export default def;
