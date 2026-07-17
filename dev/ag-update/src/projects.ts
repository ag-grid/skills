/** Root resolution and project location. A project is a folder containing a package.json file
 *  under the root, discovered by a .gitignore-aware filesystem walk (not Git). */
import * as path from "node:path";
import { findPackageJsonFiles } from "./files.ts";
import { ExitWithError, stringifyError } from "./output.ts";

/** Returns the absolute root folder to scan for projects: an explicit --root (resolved against
 *  cwd) wins; otherwise the discovered Git root; otherwise cwd. */
export function determineRoot(
  cwd: string,
  rootArg: string | undefined,
  gitRoot: string | undefined,
): string {
  if (rootArg !== undefined) return path.resolve(cwd, rootArg);
  return gitRoot ?? cwd;
}

/** Returns absolute paths of project folders; throws ExitWithError when none are found or the
 *  filesystem walk fails. */
export function locateProjects(rootPath: string): string[] {
  let projectPaths: string[];
  try {
    projectPaths = findPackageJsonFiles(rootPath);
  } catch (e) {
    throw couldNotLocateProjects(stringifyError(e));
  }
  if (projectPaths.length === 0) {
    throw couldNotLocateProjects(
      `no package.json files found under ${rootPath}`,
    );
  }
  return projectPaths;
}

function couldNotLocateProjects(detail: string): ExitWithError {
  return new ExitWithError(`could not find any projects (${detail})`, [
    "A project is a folder containing a package.json file. Check that --root points at a folder containing the projects to update, and that their package.json files are not excluded by a .gitignore rule.",
    'To scan a different folder, invoke the command again passing --root="path".',
  ]);
}
