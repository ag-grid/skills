import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, test } from "vitest";
import { globalTestStateReset, tempDir } from "./utils";

afterEach(globalTestStateReset);

const devFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("compiled js is up to date", () => {
  const freshBuild = path.join(tempDir(), "analyse-update.js");
  execFileSync(process.execPath, [
    path.join(devFolder, "build.mjs"),
    freshBuild,
  ]);
  const fresh = fs.readFileSync(freshBuild, "utf8");
  const committed = fs.readFileSync(
    path.join(devFolder, "../../skills/ag-update/scripts/analyse-update.js"),
    "utf8",
  );
  expect(
    committed === fresh,
    "analyse-update.js is out of date with the .ts source — run `npm run build` in dev/ag-update and commit the result",
  ).toBe(true);
});
