import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TestDefinition } from "../../types.ts";

// The skill makes the expected change PLUS a valid extra export. `node --check`
// passes (valid JS), so only the diff verifier can catch the unexpected change —
// the run must (correctly) fail.
const def: TestDefinition = {
  name: "harness-verify-unexpected-change-fails",
  prompt: "Run the set-value-and-add-extra skill.",
  answers: [],
  setup(workDir) {
    for (const sub of ["old", "new"]) {
      mkdirSync(join(workDir, sub), { recursive: true });
      writeFileSync(join(workDir, sub, "app.mjs"), "export const value = 1;\n");
    }
  },
  assertions: [
    { type: "command", run: "node --check app.mjs" },
    {
      type: "verifier",
      expected: "In app.mjs, the exported `value` constant changed from 1 to 2.",
      mustNotChange: "No other declarations or exports were added, such as `extra`.",
    },
  ],
  expectOutcome: "fail",
};

export default def;
