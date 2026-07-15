/** Root resolution and project location. A project is a folder containing a Git-tracked
 *  package.json file under the root. */
import * as path from 'node:path';
import { lsPackageJsonFiles } from './git.ts';
import { ExitWithError } from './output.ts';

/** Returns the absolute root folder to scan for projects. */
export function determineRoot(cwd: string, rootArg: string | undefined, gitRepoRoot: string): string {
    return rootArg !== undefined ? path.resolve(cwd, rootArg) : gitRepoRoot;
}

/** Returns absolute paths of project folders; throws ExitWithError when none are found or ls-files fails. */
export function locateProjects(rootPath: string): string[] {
    let packageJsonPaths: string[];
    try {
        packageJsonPaths = lsPackageJsonFiles(rootPath);
    } catch (e) {
        throw couldNotLocateProjects((e as Error).message);
    }
    if (packageJsonPaths.length === 0) {
        throw couldNotLocateProjects(`no package.json files found under ${rootPath}`);
    }
    return packageJsonPaths.map((packageJsonPath) => path.join(rootPath, path.dirname(packageJsonPath)));
}

function couldNotLocateProjects(detail: string): ExitWithError {
    return new ExitWithError(`could not find projects using \`git ls-files\` (${detail})`, [
        'A project is a folder containing a package.json file tracked by Git. Check that the root folder is ' +
            "inside the source code Git repo and that the projects' package.json files are committed (or at " +
            'least staged).',
        'To scan a different folder, invoke the command again passing --root="path".',
    ]);
}
