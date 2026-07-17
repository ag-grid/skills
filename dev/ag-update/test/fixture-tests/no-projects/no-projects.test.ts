import { afterEach, expect, test } from "vitest";
import { run } from "../../../src/run";
import { render } from "../../../src/output";
import { RELEASED_VERSION_URL } from "../../../src/skill-version";
import {
  expectExitWithError,
  fixtureFiles,
  globalTestStateReset,
  mockHttpFailure,
  portable,
} from "../../utils";

afterEach(globalTestStateReset);

test("exits with the could-not-locate-projects error when the root contains no package.json files", async () => {
  const output = await expectExitWithError(
    run("--root", fixtureFiles(import.meta.url), "--allow-old-version"),
  );
  expect(portable(render(output))).toMatchInlineSnapshot(`
    "ERROR: could not find any projects (no package.json files found under $REPO_ROOT$/dev/ag-update/test/fixture-tests/no-projects/files)

    A project is a folder containing a package.json file. Check that --root points at a folder containing the projects to update, and that their package.json files are not excluded by a .gitignore rule.

    To scan a different folder, invoke the command again passing --root="path".
    "
  `);
});

test("notices added during the run appear at the bottom of error output", async () => {
  // The skill-version fetch fails, adding a NOTICE, then discovery hits the could-not-locate ERROR.
  mockHttpFailure(RELEASED_VERSION_URL);
  const output = await expectExitWithError(
    run("--root", fixtureFiles(import.meta.url)),
  );
  expect(output.status).toBe("ERROR");
  expect(output.notices.length).toBeGreaterThan(0);
  expect(render(output).trimEnd().split("\n\n").at(-1)).toMatch(/^NOTICE: /);
});
