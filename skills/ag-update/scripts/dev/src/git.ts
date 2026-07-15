/** execFile wrappers around the Git operations the script relies on. */
import { execFileSync } from 'node:child_process';
import { ExitWithError } from './output.ts';

const EXEC_OPTIONS = {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
} satisfies import('node:child_process').ExecFileSyncOptionsWithStringEncoding;

/** Returns the absolute path of the Git repo root; throws ExitWithError when not in a repo / git missing. */
export function gitRepoRoot(cwd: string): string {
    try {
        return execFileSync('git', ['rev-parse', '--show-toplevel'], { ...EXEC_OPTIONS, cwd }).trim();
    } catch {
        // Covers both failure shapes: git exiting non-zero (not a repo) and execFileSync
        // throwing ENOENT (git not installed).
        throw new ExitWithError('not in a Git repo or Git is not installed', [
            'This script uses Git to search project files and determine which files to ignore.',
            'Ensure that the cwd is inside the source code Git repo and that Git is installed.',
            'To run the script on files not tracked by Git, create a temporary Git repo in an appropriate parent directory and commit the project source files to it. Use .gitignore files to declare which files are not source code files, including node_modules files and build output folders. If there is an alternative VCS in use, use its ignore files or other relavent project configuration to determine the apporpriate files to ignore.',
            "IMPORTANT: creating this temporary Git repo will affect the user's workspace, ask them for permission before going ahead and creating a temporary Git repo.",
        ]);
    }
}

/** Lists Git-tracked package.json paths under rootPath, relative to rootPath.
 *  Throws the underlying error when ls-files fails; the caller owns the ERROR message. */
export function lsPackageJsonFiles(rootPath: string): string[] {
    const stdout = execFileSync('git', ['-C', rootPath, 'ls-files', '**/package.json', 'package.json'], EXEC_OPTIONS);
    return stdout.split('\n').filter((line) => line !== '');
}

export interface GrepHit {
    /** Path relative to dir. */
    file: string;
    /** 1-based line number. */
    line: number;
    /** The matched line's content. */
    content: string;
}

/** Runs one `git grep -n --fixed-strings` for all words over the Git-tracked files under dir. */
export function grepFixedStrings(dir: string, words: string[]): GrepHit[] {
    if (words.length === 0) return [];
    const patternArgs = words.flatMap((word) => ['-e', word]);
    let stdout: string;
    try {
        stdout = execFileSync('git', ['-C', dir, 'grep', '-n', '--fixed-strings', ...patternArgs, '--', '.'], EXEC_OPTIONS);
    } catch (e) {
        if ((e as { status?: number }).status === 1) return []; // exit 1 = no matches
        throw e;
    }
    return stdout
        .split('\n')
        .filter((line) => line !== '')
        .map((line) => {
            const [file, lineNumber] = line.split(':', 2);
            const content = line.slice(file.length + lineNumber.length + 2);
            return { file, line: parseInt(lineNumber, 10), content };
        });
}
