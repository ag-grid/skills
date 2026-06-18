import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TestDefinition } from "../../types.ts";

// The skill writes invalid JS, so the `node --check` command oracle must fail and
// the run must (correctly) fail.
const def: TestDefinition = {
  name: "harness-verify-syntax-error-fails",
  prompt: "Run the write-broken-value skill.",
  answers: [],
  setup(workDir) {
    for (const sub of ["old", "new"]) {
      mkdirSync(join(workDir, sub), { recursive: true });
      writeFileSync(join(workDir, sub, "app.mjs"), "export const value = 1;\n");
    }
  },
  assertions: [{ type: "command", run: "node --check app.mjs" }],
  expectOutcome: "fail",
};

export default def;
