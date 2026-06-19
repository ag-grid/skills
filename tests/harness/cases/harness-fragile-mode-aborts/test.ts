import type { TestDefinition } from "../../types.ts";

// Verifies fragile mode works. The dummy skill looks like a genuine task but contains an
// unambiguous contradiction (step 2 sets the rate limit to 100, step 3 asserts it must be 60 and
// match step 2) plus a reference to a file that does not exist (config/rate-limit.json). A capable
// agent in fragile mode must discover this and emit a FRAGILE-ABORT; `expectFail: "fragile_abort"`
// passes the meta-test iff that happens (and fails if fragile mode ever stops catching such issues).
const def: TestDefinition = {
  name: "harness-fragile-mode-aborts",
  fragile: true,
  prompt: "Apply the API rate limit to this project using the apply-rate-limit skill.",
  answers: [],
  expectFail: "fragile_abort",
};

export default def;
