/** Skill version handling: the local VERSION.md and the released-version check. */
import * as fs from "node:fs";
import * as path from "node:path";
import { addNotice, ExitWithError } from "./output.ts";
import { compareVersions } from "./types.ts";

export const RELEASED_VERSION_URL =
  "https://raw.githubusercontent.com/ag-grid/skills/main/skills/ag-update/VERSION.md";

let mockedSkillVersion: string | undefined;

/** Test hook: forces localSkillVersion() to return `version`, or restores the real VERSION.md
 *  lookup when undefined. Keeps version-dependent snapshots stable across VERSION.md bumps. */
export function mockCurrentSkillVersion(version: string | undefined): void {
  mockedSkillVersion = version;
}

/** Reads the local skill version from VERSION.md in the skill folder. The compiled bundle lives
 *  at skills/ag-update/scripts/, so walking up finds skills/ag-update/VERSION.md. In source form
 *  the code runs from dev/ag-update/src/, which is outside the skill folder, so a source-mode
 *  fallback points back at skills/ag-update/VERSION.md relative to the source dir. */
export function localSkillVersion(): string {
  if (mockedSkillVersion !== undefined) return mockedSkillVersion;
  // __dirname in the compiled CJS bundle; the import.meta fallback is for vitest's ESM
  // transform and is unreachable in the bundle (build.mjs silences the resulting warning).
  const dir =
    typeof __dirname !== "undefined"
      ? __dirname
      : new URL(".", import.meta.url).pathname;
  let walk = dir;
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(walk, "VERSION.md");
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, "utf8").trim();
    }
    walk = path.dirname(walk);
  }
  // Source-mode (npm run cli / non-mocked vitest): dir is dev/ag-update/src, from which the
  // walk-up above cannot reach the skill folder. Point directly at the skill's VERSION.md.
  const sourceFallback = path.join(dir, "../../../skills/ag-update/VERSION.md");
  if (fs.existsSync(sourceFallback)) {
    return fs.readFileSync(sourceFallback, "utf8").trim();
  }
  throw new Error(`VERSION.md not found in any folder above ${dir}`);
}

/** The "newer skill version available" ERROR, shared with the minimumSkillVersion check in records.ts. */
export function newerSkillVersionError(
  current: string,
  newVersion: string,
): ExitWithError {
  return new ExitWithError(
    `a new version of this skill is available. Current version ${current}; new version ${newVersion}.`,
    [
      "Tell the user that they are recommended to update the skill by running `npx skills update ag-grid/skills`, but alternatively may choose to continue running this outdated version.",
      "Stop and wait for the user to respond. If they ask to continue using this version, invoke the script again adding the --allow-old-version argument.",
    ],
  );
}

/** Resolves normally when OK to continue; throws ExitWithError when a newer skill version is available. */
export async function checkSkillVersion(
  allowOldVersion: boolean,
): Promise<void> {
  if (allowOldVersion) return;
  const local = localSkillVersion();
  let released: string;
  try {
    const response = await fetch(RELEASED_VERSION_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    released = (await response.text()).trim();
  } catch {
    addNotice(
      `currently using ag-update v${local}, could not fetch ${RELEASED_VERSION_URL} to check if a newer version exists`,
    );
    return;
  }
  if (compareVersions(released, local) > 0) {
    throw newerSkillVersionError(local, released);
  }
}
