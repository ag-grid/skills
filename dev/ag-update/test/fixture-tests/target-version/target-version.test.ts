import { afterEach, expect, test } from "vitest";
import { run } from "../../../src/run";
import { render } from "../../../src/output";
import {
  expectExitWithError,
  fixtureFiles,
  globalTestStateReset,
  serveChangelogs,
} from "../../utils";
import { FIXTURE, gridChangelog } from "../grid-app/fixture";

afterEach(globalTestStateReset);

/** This fixture's files/ is a single project depending on both AG Grid and AG Charts. */
const MULTI_PRODUCT = fixtureFiles(import.meta.url);

test("a grid target below the latest scopes the report to that version", async () => {
  // gridChangelog: latest 34.0.0; a transition removed in 33.0.0 and a behaviour change in 34.0.0.
  serveChangelogs({ grid: gridChangelog() });
  const output = await run(
    "--root",
    FIXTURE,
    "--grid-target-version=33.0",
    "--allow-old-version",
  );
  const summary = render(output);
  expect(summary).toContain("Latest available versions: Grid v34.0.0.");
  expect(summary).toContain(
    "These reports were generated for target version: Grid v33.0.",
  );
  const report = output.reportFiles["report--app.md"];
  expect(report).toContain("### oldGridApi"); // removed in 33.0.0 — within the target
  expect(report).not.toContain("rows are now sorted stably by default"); // 34.0.0 — beyond it
});

test("errors when a target is below a project's current version", async () => {
  // app is on 32.1.0; no network is reached because validation fails first.
  const output = await expectExitWithError(
    run("--root", FIXTURE, "--grid-target-version=31.0", "--allow-old-version"),
  );
  expect(render(output)).toContain("is below the current version");
});

test("errors when a target is newer than the latest available version", async () => {
  serveChangelogs({ grid: gridChangelog() }); // latest 34.0.0
  const output = await expectExitWithError(
    run("--root", FIXTURE, "--grid-target-version=99.0", "--allow-old-version"),
  );
  expect(render(output)).toContain(
    "is newer than the latest available version",
  );
});

test("errors when a target is set for only some of the products in use", async () => {
  const output = await expectExitWithError(
    run(
      "--root",
      MULTI_PRODUCT,
      "--grid-target-version=33.0",
      "--allow-old-version",
    ),
  );
  const message = render(output);
  expect(message).toContain("some but not all of the products in use");
  expect(message).toContain("only the latest versions");
});

test("a target for a product not in use is noted and ignored", async () => {
  serveChangelogs({ grid: gridChangelog() });
  const output = await run(
    "--root",
    FIXTURE,
    "--studio-target-version=2.0",
    "--allow-old-version",
  );
  expect(output.status).toBe("SUCCESS");
  expect(output.notices.join("\n")).toContain("no scanned project uses Studio");
});
