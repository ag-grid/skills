import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, expect, test } from "vitest";
import { globalTestStateReset, portable, runCompiled, tempDir, writeChangelogsToDisk } from "../../utils";
import { FIXTURE, gridChangelog } from "./fixture";

afterEach(globalTestStateReset);

test("happy path — fixture repo in, reports out, SUCCESS on stderr, exit code 0", () => {
  const changesUrlPrefix = writeChangelogsToDisk({ grid: gridChangelog() });
  const outputFolder = path.join(tempDir(), "out");
  const result = runCompiled([
    `--root=${FIXTURE}`,
    "--allow-old-version",
    `--changes-url-prefix=${changesUrlPrefix}`,
    `--output-folder=${outputFolder}`,
  ]);
  expect(portable(result)).toMatchInlineSnapshot(`
    "exitCode: 0
    stderr:
    SUCCESS: report files produced

    The latest versions are: Grid v34.0.0.

    Discovered the following projects and created update reports:

    - $REPO_ROOT$/skills/ag-update/scripts/dev/test/fixture-tests/grid-app/files/app: using Grid v32.1.0 -> $TMPDIR$/out/app-report.md

    The following projects contain no AG dependencies and were not analysed:

    - $REPO_ROOT$/skills/ag-update/scripts/dev/test/fixture-tests/grid-app/files/lib

    Confirm with the user that they want to update to the latest versions. If they choose an earlier version, disregard the report items introduced after the chosen version.

    Confirm with the user that this is the correct set of projects to update, and disregard the reports for any projects they do not want to update.

    Use your normal planning process and knowledge of the application's structure, coding standards, and development process to plan the change. Take into account the number of changes. If there are a very large number of changes across many files it may make sense to work with the user to plan a phased approach. If there are only a few changes it may be appropriate to apply them in a single phase. Work with the user to make an appropriate plan.
    "
  `);
  // the wrapper joined reportFiles to the output folder and wrote them
  expect(fs.readdirSync(outputFolder).sort()).toEqual(["app-report.md", "summary.md"]);
});
