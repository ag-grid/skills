import { afterEach, expect, test } from "vitest";
import { runCli } from "../../../src/main";
import { render } from "../../../src/output";
import { expectExitWithError, fixtureFiles, globalTestStateReset, portable } from "../../utils";

afterEach(globalTestStateReset);

test("exits with the could-not-locate-projects error when the root contains no package.json files", async () => {
  const output = await expectExitWithError(runCli("--root", fixtureFiles(import.meta.url), "--allow-old-version"));
  expect(portable(render(output))).toMatchInlineSnapshot(`
    "ERROR: could not find projects using \`git ls-files\` (no package.json files found under $REPO_ROOT$/skills/ag-update/scripts/dev/test/fixture-tests/no-projects/files)

    A project is a folder containing a package.json file tracked by Git. Check that the root folder is inside the source code Git repo and that the projects' package.json files are committed (or at least staged).

    To scan a different folder, invoke the command again passing --root="path".
    "
  `);
});
