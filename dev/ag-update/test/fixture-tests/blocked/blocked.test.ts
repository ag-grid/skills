import { afterEach, expect, test } from "vitest";
import { run } from "../../../src/run";
import { render } from "../../../src/output";
import {
  changelog,
  fixtureFiles,
  globalTestStateReset,
  serveChangelogs,
} from "../../utils";

afterEach(globalTestStateReset);

const FILES = fixtureFiles(import.meta.url);

test("blocked project gets no report and is listed with its reason in the SUCCESS message", async () => {
  // "app" is updatable (so the run succeeds); "legacy" depends on the Vue 2 wrapper and is blocked.
  serveChangelogs({ grid: changelog({ mostRecentVersion: "34.0.0" }) });
  const output = await run("--root", FILES, "--allow-old-version");
  expect(Object.keys(output.reportFiles).sort()).toEqual([
    "app-report.md",
    "summary.md",
  ]);
  const message = render(output);
  expect(message).toContain("cannot be updated by this skill");
  expect(message).toContain("migrate their application to Vue 3");
  expect(message).not.toContain("legacy-report.md");
});
