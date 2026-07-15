/** Patches snapshotted text to be portable across machines: the result must contain no paths
 *  (or versions) only valid on one machine, while preserving the parts under test. */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { localSkillVersion } from "../../src/skill-version";

/** Absolute path of this Git repo's root — the repo integration tests run against. */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../..");

export function portable(text: string): string {
  // Temp folders (mkdtemp names are random): swallow the tmpdir prefix plus the one random
  // segment, preserving the rest of the path so e.g. report file names stay asserted.
  for (const tmp of new Set([os.tmpdir(), fs.realpathSync(os.tmpdir())])) {
    text = text.replace(new RegExp(`${escapeRegExp(tmp)}/[^/\\s:]+`, "g"), () => "$TMPDIR$");
  }
  text = text.replaceAll(REPO_ROOT, () => "$REPO_ROOT$");
  text = text.replaceAll(localSkillVersion(), () => "$VERSION$");
  text = text.replace(/current version = v[\d.]+/g, () => "current version = $NODE_VERSION$");
  return text;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
