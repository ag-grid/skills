// The procedural entry point of the compiled script: the only code that writes files/stderr and
// exits. Executed directly (never imported — tests import run.ts), so it needs no entry guard.
//
// version-check must be the first import: it guards the Node version before any other module
// (which may use newer Node APIs) is loaded. --format=cjs ensures imports execute in order.
import "./version-check.ts";

import * as fs from "node:fs";
import * as path from "node:path";
import { ExitWithError, render, type ScriptOutput } from "./output.ts";
import { crashError, run } from "./run.ts";

process.on("uncaughtException", (e) => exitWith(crashError(e).output));
process.on("unhandledRejection", (e) => exitWith(crashError(e).output));
// Undocumented hooks letting process tests trigger the crash handlers in the real script:
if (process.env.MOCK_EXCEPTION) throw new Error("MOCK_EXCEPTION");
if (process.env.MOCK_UNHANDLED_REJECTION) void Promise.reject(new Error("MOCK_UNHANDLED_REJECTION"));

void run(...process.argv.slice(2)).then(
  (output) => {
    writeReportFiles(output);
    exitWith(output);
  },
  (e: unknown) => exitWith(e instanceof ExitWithError ? e.output : crashError(e).output),
);

function exitWith(output: ScriptOutput): never {
  process.stderr.write(render(output));
  process.exit(output.status === "SUCCESS" ? 0 : 1);
}

function writeReportFiles(output: ScriptOutput): void {
  try {
    fs.mkdirSync(output.outputFolder, { recursive: true });
    for (const [name, content] of Object.entries(output.reportFiles)) {
      fs.writeFileSync(path.join(output.outputFolder, name), content);
    }
  } catch {
    exitWith(
      new ExitWithError(`could not write to ${output.outputFolder}`, [
        "Invoke the command again passing --output-folder=path and selecting a path that the script will be able to write to",
      ]).output,
    );
  }
}
