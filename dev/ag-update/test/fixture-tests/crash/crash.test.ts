import { afterEach, expect, test } from "vitest";
import { run } from "../../../src/run";
import {
  expectExitWithError,
  fixtureFiles,
  globalTestStateReset,
} from "../../utils";

afterEach(globalTestStateReset);

test("an unexpected (non-ExitWithError) exception thrown from a stage yields the crash report output", async () => {
  // The fixture's package.json is malformed, so getProjectInfo's JSON.parse throws a SyntaxError —
  // not an ExitWithError — which the run() catch converts to the internal-error crash output.
  const output = await expectExitWithError(
    run("--root", fixtureFiles(import.meta.url), "--allow-old-version"),
  );
  expect(output.statusLine).toContain(
    "the script terminated because of an internal error",
  );
  expect(output.body[0]).toContain("SyntaxError");
  // The crash formatter keeps skill frames with paths stripped to /ag-update/.
  expect(output.body[0]).toContain("/ag-update/");
});
