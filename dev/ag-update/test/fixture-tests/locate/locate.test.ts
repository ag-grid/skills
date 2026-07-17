import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, expect, test } from "vitest";
import { locateProjects } from "../../../src/projects";
import { fixtureFiles, globalTestStateReset } from "../../utils";

afterEach(globalTestStateReset);

const FILES = fixtureFiles(import.meta.url);

test("discovery is a .gitignore-aware filesystem walk: gitignored excluded, untracked included", () => {
  // The committed .gitignore ignores ignored/. Both extra/ and ignored/ package.json files are
  // written at runtime (untracked). extra/ is not ignored so it must appear — the meaningful
  // change from the old git ls-files behaviour, which only saw committed/staged files. ignored/
  // is matched by .gitignore so it must be excluded.
  const untrackedDir = path.join(FILES, "extra");
  const ignoredDir = path.join(FILES, "ignored");
  fs.mkdirSync(untrackedDir, { recursive: true });
  fs.mkdirSync(ignoredDir, { recursive: true });
  fs.writeFileSync(path.join(untrackedDir, "package.json"), "{}");
  fs.writeFileSync(path.join(ignoredDir, "package.json"), "{}");
  try {
    const located = locateProjects(FILES)
      .map((projectPath) => path.relative(FILES, projectPath))
      .sort();
    expect(located).toEqual(["app", "extra", "lib"]);
  } finally {
    fs.rmSync(untrackedDir, { recursive: true, force: true });
    fs.rmSync(ignoredDir, { recursive: true, force: true });
  }
});
