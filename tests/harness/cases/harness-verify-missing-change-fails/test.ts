import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TestDefinition } from "../../types.ts";

// The skill makes no change, so the verifier must report the expected change as
// missing and the run must (correctly) fail.
const def: TestDefinition = {
  name: "harness-verify-missing-change-fails",
  prompt: "Run the leave-files-unchanged skill.",
  answers: [],
  setup(workDir) {
    for (const sub of ["old", "new"]) {
      mkdirSync(join(workDir, sub), { recursive: true });
      writeFileSync(join(workDir, sub, "app.mjs"), "export const value = 1;\n");
    }
  },
  assertions: [
    {
      type: "verifier",
      expected: "In app.mjs, the exported `value` constant changed from 1 to 2.",
      mustNotChange: "No other declarations, exports, or files were added, removed, or modified.",
    },
  ],
  expectOutcome: "fail",
};

export default def;
