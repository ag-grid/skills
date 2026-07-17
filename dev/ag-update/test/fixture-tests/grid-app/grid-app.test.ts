import { afterEach, expect, test } from "vitest";
import { run } from "../../../src/run";
import { render } from "../../../src/output";
import { RELEASED_VERSION_URL } from "../../../src/skill-version";
import {
  changelog,
  expectExitWithError,
  globalTestStateReset,
  mockHttpResponse,
  portable,
  requestedUrls,
  serveChangelogs,
} from "../../utils";
import { FIXTURE, gridChangelog } from "./fixture";

afterEach(globalTestStateReset);

test("happy path — fixture repo in, reports out, SUCCESS message rendered", async () => {
  serveChangelogs({ grid: gridChangelog() });
  const output = await run("--root", FIXTURE, "--allow-old-version");
  expect(portable(render(output))).toMatchInlineSnapshot(`
    "SUCCESS: report files produced

    The latest versions are: Grid v34.0.0.

    Discovered the following projects and created update reports:

    - app: using Grid v32.1.0 -> $TMPDIR$/app-report.md

    The following projects contain no AG dependencies and were not analysed:

    - lib

    Source files were searched with the glob: **/*.{js,jsx,mjs,cjs,ts,tsx,vue,svelte,astro,html} (override with --source-glob).

    Confirm with the user that they want to update to the latest versions. If they choose an earlier version, disregard the report items introduced after the chosen version.

    Confirm with the user that this is the correct set of projects to update, and disregard the reports for any projects they do not want to update.

    Use your normal planning process and knowledge of the application's structure, coding standards, and development process to plan the change. Take into account the number of changes. If there are a very large number of changes across many files it may make sense to work with the user to plan a phased approach. If there are only a few changes it may be appropriate to apply them in a single phase. Work with the user to make an appropriate plan.
    "
  `);
  expect(portable(output.reportFiles["app-report.md"])).toMatchInlineSnapshot(`
    "# AG dependency update report

    This file contains a list of changes to apply to the project described in the Scope section
    below. Combine it with your knowledge of the coding conventions and verification tools
    available for this project to plan and execute an update. After applying these changes use
    the appropriate tools at your disposal to validate that the changes were successful, such as
    running the build, typechecking, tests, and starting the dev server and accessing it with a
    browser.

    # Scope

    - Project path: app
    - Grid: current version 32.1.0, target version 34.0.0, used via react

    # Required changes

    ## Grid

    ### Grid v32.x -> v33.x

    #### REMOVED: oldGridApi

    As of v33.0.0, oldGridApi has been removed. Use api.newGridApi instead.

    Mitigation: Replace calls to \`oldGridApi()\` with \`api.newGridApi()\`.

    Detected in:

    - src/main.js:4 (oldGridApi)

    # Optional changes

    The changes in this section are optional: the project will still work if they are accepted as-is. Resolve each decision below with the user while planning the update.

    ## Grid

    ### Grid v33.x -> v34.x

    #### DECISION: rows are now sorted stably by default

    Mitigation: none — this change can only be accepted.

    Detected in: this change cannot be ruled out by searching the source code; check whether it applies to this project during planning.

    TODO add style changes and advice on QA based on style and behaviour changes
    "
  `);
});

test("report written per project with expected filename (asserted via reportFiles)", async () => {
  serveChangelogs({ grid: gridChangelog() });
  const output = await run("--root", FIXTURE, "--allow-old-version");
  // one report for "app"; "lib" has no AG dependencies so gets no report
  expect(Object.keys(output.reportFiles).sort()).toEqual([
    "app-report.md",
    "summary.md",
  ]);
});

test("on SUCCESS, reportFiles contains summary.md holding the rendered SUCCESS output", async () => {
  serveChangelogs({ grid: gridChangelog() });
  const output = await run("--root", FIXTURE, "--allow-old-version");
  expect(output.reportFiles["summary.md"]).toBe(render(output));
});

test("on ERROR there is no summary.md (reportFiles is empty)", async () => {
  mockHttpResponse(RELEASED_VERSION_URL, "99.0.0"); // force the newer-skill-version ERROR
  const output = await expectExitWithError(run("--root", FIXTURE));
  expect(output.reportFiles).toEqual({});
});

test("exits with an error when projects are found but none are updatable", async () => {
  // Root scoped to "lib", which has a package.json but no AG dependencies.
  const output = await expectExitWithError(
    run("--root", `${FIXTURE}/lib`, "--allow-old-version"),
  );
  expect(portable(render(output))).toMatchInlineSnapshot(`
    "ERROR: no updatable projects found under $REPO_ROOT$/dev/ag-update/test/fixture-tests/grid-app/files/lib

    The following projects contain no AG dependencies and were not analysed:

    - .

    Check that --root points at the intended folder and that the projects depend on AG Grid, AG Charts or AG Studio. To scan a different folder, invoke the command again passing --root="path".
    "
  `);
});

test("--root limits located projects to those under the root folder", async () => {
  serveChangelogs({ grid: gridChangelog() });
  const output = await run("--root", `${FIXTURE}/app`, "--allow-old-version");
  // scoped to "app" only; "lib" sits outside the root and is not located
  expect(Object.keys(output.reportFiles).sort()).toEqual([
    "app-report.md",
    "summary.md",
  ]);
  expect(render(output)).not.toContain("/lib");
});

test("project with no detected changes still gets a report stating none were detected", async () => {
  serveChangelogs({
    grid: changelog({ mostRecentVersion: "34.0.0", changes: [] }),
  });
  const output = await run("--root", `${FIXTURE}/app`, "--allow-old-version");
  const report = output.reportFiles["app-report.md"];
  expect(report).toContain("No required changes were detected.");
  expect(report).toContain("No optional changes were detected.");
});

test("changelogs are fetched only for products in use across the projects", async () => {
  serveChangelogs({
    grid: gridChangelog(),
    charts: changelog(),
    studio: changelog(),
  });
  await run("--root", FIXTURE, "--allow-old-version");
  const changelogRequests = requestedUrls().filter((url) =>
    url.includes("version-change-records"),
  );
  expect(changelogRequests).toEqual([
    "https://ag-grid.com/version-change-records.json",
  ]);
});
