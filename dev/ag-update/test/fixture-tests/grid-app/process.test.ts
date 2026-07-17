import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, expect, test } from "vitest";
import {
  globalTestStateReset,
  portable,
  runCompiled,
  tempDir,
  writeChangelogsToDisk,
} from "../../utils";
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

    ## What was scanned

    - Scan root: $REPO_ROOT$/dev/ag-update/test/fixture-tests/grid-app/files
    - Source files were searched with the glob: **/*.{js,jsx,mjs,cjs,ts,tsx,vue,svelte,astro,html} (default)
    - Discovered 2 package.json files:
      - app/package.json
      - lib/package.json

    ## Projects to update

    - app: Grid v32.1.0 -> v34.0.0 (report: $TMPDIR$/out/report--app.md)

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
  // the wrapper joined reportFiles to the output folder and wrote them
  expect(fs.readdirSync(outputFolder).sort()).toEqual([
    "report--app.md",
    "summary.md",
  ]);
});
