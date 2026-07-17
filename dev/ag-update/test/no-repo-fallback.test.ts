import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, expect, test } from "vitest";
import { run } from "../src/run";
import {
  assertOutsideGitRepo,
  changelog,
  globalTestStateReset,
  inDirectory,
  serveChangelogs,
  tempDir,
} from "./utils";

afterEach(globalTestStateReset);

test("with no --root and no Git repo, the scan falls back to cwd and succeeds", async () => {
  // A temp folder outside any Git repo, containing one AG Grid project. Discovery must fall back
  // to cwd (no --root, no .git found) and locate it — proving the tool no longer requires Git.
  const dir = tempDir();
  assertOutsideGitRepo(dir);
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ dependencies: { "ag-grid-community": "32.1.0" } }),
  );
  fs.writeFileSync(path.join(dir, "app.js"), "const x = 1;\n");

  serveChangelogs({ grid: changelog({ mostRecentVersion: "34.0.0" }) });
  const output = await inDirectory(dir, () => run("--allow-old-version"));

  expect(output.status).toBe("SUCCESS");
  // The scanned project is cwd itself, so its relative path is "." → the bare report.md.
  expect(Object.keys(output.reportFiles).sort()).toEqual([
    "report.md",
    "summary.md",
  ]);
});
