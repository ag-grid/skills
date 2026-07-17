import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, expect, test } from "vitest";
import { run } from "../src/run";
import { render } from "../src/output";
import {
  expectExitWithError,
  globalTestStateReset,
  portable,
  tempDir,
} from "./utils";
import { FIXTURE } from "./fixture-tests/grid-app/fixture";

afterEach(globalTestStateReset);

test("--output-folder pointing at a non-empty directory exits with an error", async () => {
  const outputFolder = tempDir();
  fs.writeFileSync(path.join(outputFolder, "existing.txt"), "keep me");
  const output = await expectExitWithError(
    run(
      "--root",
      FIXTURE,
      "--allow-old-version",
      "--output-folder",
      outputFolder,
    ),
  );
  expect(portable(render(output))).toMatchInlineSnapshot(`
      "ERROR: output folder $TMPDIR$ is not empty

      Invoke the command again passing --output-folder=path and selecting an empty or new folder, so the reports do not overwrite existing files.
      "
    `);
});

test("unwritable output folder exits with the could-not-write error", async () => {
  const readOnly = path.join(tempDir(), "read-only");
  fs.mkdirSync(readOnly, { mode: 0o500 });
  try {
    const output = await expectExitWithError(
      run(
        "--root",
        FIXTURE,
        "--allow-old-version",
        "--output-folder",
        readOnly,
      ),
    );
    expect(portable(render(output))).toMatchInlineSnapshot(`
          "ERROR: could not write to $TMPDIR$/read-only

          Invoke the command again passing --output-folder=path and selecting a path that the script will be able to write to
          "
        `);
  } finally {
    fs.chmodSync(readOnly, 0o700); // let globalTestStateReset remove it
  }
});
