/** Filesystem discovery and content search, honouring .gitignore via globby. Replaces the former
 *  git.ts: the script owns directory traversal itself and never shells out to Git, so it runs
 *  inside a repo or not, and picks up untracked-but-unignored files that `git ls-files` missed. */
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { globbySync } from "globby";

/** Always-ignored paths, regardless of any .gitignore. globby's `gitignore: true` only reads
 *  .gitignore files at or below the scan cwd (not parent directories, as Git would), so these
 *  cover the common noise that a parent .gitignore would otherwise exclude. */
const DEFAULT_IGNORES = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/out-tsc/**",
  "**/coverage/**",
];

/** Default content-search scope: an allowlist of source file extensions. Overridable per run via
 *  --source-glob. Kept deliberately broad across the frameworks AG products ship wrappers for. */
export const DEFAULT_SOURCE_GLOB = [
  "**/*.{js,jsx,mjs,cjs,ts,tsx,vue,svelte,astro,html}",
];

/** Walks up from cwd looking for a `.git` entry (a directory in a normal clone, a file in a
 *  worktree/submodule); returns the containing folder, or undefined when none is found. */
export function findGitRoot(cwd: string): string | undefined {
  let dir = path.resolve(cwd);
  for (;;) {
    if (existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/** Returns absolute paths of the folders containing a package.json under root, honouring
 *  .gitignore and DEFAULT_IGNORES. */
export function findPackageJsonFiles(root: string): string[] {
  return globbySync("**/package.json", {
    cwd: root,
    gitignore: true,
    ignore: DEFAULT_IGNORES,
    dot: true,
    absolute: true,
  }).map((packageJsonPath) => path.dirname(packageJsonPath));
}

export interface SearchHit {
  /** Path relative to dir. */
  file: string;
  /** 1-based line number. */
  line: number;
  /** The matched line's content. */
  content: string;
}

/** The `git grep -n --fixed-strings` replacement: finds every line under dir (within sourceGlob,
 *  honouring .gitignore) that contains at least one of the fixed-string words. Emits one hit per
 *  matching line — matching any word — mirroring git grep, so downstream whole-word filtering is
 *  unchanged. Binary files (NUL byte) are skipped. */
export function searchFixedStrings(
  dir: string,
  words: string[],
  sourceGlob: string[],
): SearchHit[] {
  if (words.length === 0) return [];
  const files = globbySync(sourceGlob, {
    cwd: dir,
    gitignore: true,
    ignore: DEFAULT_IGNORES,
    dot: true,
    absolute: false,
  });
  const hits: SearchHit[] = [];
  for (const file of files) {
    const buffer = readFileSync(path.join(dir, file));
    if (buffer.includes(0)) continue; // binary file
    const lines = buffer.toString("utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const content = lines[i];
      if (words.some((word) => content.includes(word))) {
        hits.push({ file, line: i + 1, content });
      }
    }
  }
  return hits;
}
