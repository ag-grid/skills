import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "harness-verify-correct-change-passes",
  prompt: "Run the set-value-to-2 skill.",
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
      mustNotChange: "No other declarations, exports, or files were added, removed, or modified.",
    },
  ],
  expectOutcome: "pass",
};

export default def;
