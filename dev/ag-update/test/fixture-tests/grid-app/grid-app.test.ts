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

    ## What was scanned

    - Scan root: $REPO_ROOT$/dev/ag-update/test/fixture-tests/grid-app/files
    - Source files were searched with the glob: **/*.{js,jsx,mjs,cjs,ts,tsx,vue,svelte,astro,html} (default)
    - Discovered 2 package.json files:
      - app/package.json
      - lib/package.json

    ## Projects to update

    - app: Grid v32.1.0 -> v34.0.0 (report: $TMPDIR$/report--app.md)

    Latest available versions: Grid v34.0.0.

    These reports were generated for target version: Grid v34.0.0.

    The following projects contain no AG dependencies and were not analysed:

    - lib

    ## Before applying: verify the reports are correct

    1. Verify the scan. The default source glob was used — check the scan root and the discovered package.json files listed above are the ones you expected, and that the glob covers the file types this codebase uses for source. If not, re-run with an appropriate --root and/or --source-glob.

    2. Verify the target version. These reports were generated for the target version shown above (the latest of each product unless overridden). To target an earlier version, re-run setting the per-product flag(s) — --grid-target-version, --charts-target-version, --studio-target-version — as major.minor (e.g. --grid-target-version=34.2). Note: if a project uses several products and you set a target for one, you must set one for all of them, using versions you have confirmed are compatible.

    Once you have verified the above and the reports are correct, follow the update guide to apply them:
      $REPO_ROOT$/skills/ag-update/applying-updates.md
    "
  `);
  expect(portable(output.reportFiles["report--app.md"])).toMatchInlineSnapshot(`
    "# Update report for $REPO_ROOT$/dev/ag-update/test/fixture-tests/grid-app/files/app/package.json

    See [summary.md](summary.md) for how to apply these changes.

    # Project Dependencies

    - Grid: current version 32.1.0, target version 34.0.0, used via react

    # Changes

    ## Grid v32.x -> v33.x

    ### oldGridApi

    - **Type:** TRANSITION
    - **Optionality:** MANDATORY — old API removed

    Use api.newGridApi instead.

    Mitigation (apply these steps to complete this update): Replace calls to \`oldGridApi()\` with \`api.newGridApi()\`.

    Detected in:

    - src/main.js ("oldGridApi")

    ## Grid v33.x -> v34.x

    ### rows are now sorted stably by default

    - **Type:** BEHAVIOUR
    - **Optionality:** MANDATORY — there is no documented flag to restore the old behaviour
    "
  `);
});

test("report written per project with expected filename (asserted via reportFiles)", async () => {
  serveChangelogs({ grid: gridChangelog() });
  const output = await run("--root", FIXTURE, "--allow-old-version");
  // one report for "app"; "lib" has no AG dependencies so gets no report
  expect(Object.keys(output.reportFiles).sort()).toEqual([
    "report--app.md",
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
  // scoped to "app" only; "lib" sits outside the root and is not located. The root IS the
  // project here, so its relative path is "." and the report file is the bare report.md.
  expect(Object.keys(output.reportFiles).sort()).toEqual([
    "report.md",
    "summary.md",
  ]);
  expect(render(output)).not.toContain("/lib");
});

test("project with no detected changes still gets a report stating none were detected", async () => {
  serveChangelogs({
    grid: changelog({ mostRecentVersion: "34.0.0", changes: [] }),
  });
  const output = await run("--root", `${FIXTURE}/app`, "--allow-old-version");
  // root IS the project, so the report file is the bare report.md (relative path ".").
  const report = output.reportFiles["report.md"];
  expect(report).toContain("No relevant changes were detected.");
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
