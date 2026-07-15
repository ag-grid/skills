/** Filesystem setup helpers. Committed fixtures are read-only during tests; anything writable
 *  lives in temp folders created here and removed by globalTestStateReset. */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const tempDirs: string[] = [];

/** A fresh temp directory, cleaned up by globalTestStateReset. */
export function tempDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-update-test-'));
    tempDirs.push(dir);
    return dir;
}

export function cleanupTempDirs(): void {
    for (const dir of tempDirs.splice(0)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

/** Runs fn with the process chdir'd into dir, restoring the previous cwd afterwards.
 *  (Requires vitest pool "forks": worker threads cannot chdir.) */
export async function inDirectory<T>(dir: string, fn: () => T | Promise<T>): Promise<T> {
    const previous = process.cwd();
    process.chdir(dir);
    try {
        return await fn();
    } finally {
        process.chdir(previous);
    }
}

/** Defensive check for tests that rely on a directory not being inside any Git repo. */
export function assertOutsideGitRepo(dir: string): void {
    try {
        execFileSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], { stdio: 'ignore' });
    } catch {
        return; // rev-parse failed: not in a repo, as required
    }
    throw new Error(`test setup problem: ${dir} is unexpectedly inside a Git repo`);
}

/** The committed fixture folder colocated with a test file: pass import.meta.url, get .../files. */
export function fixtureFiles(testFileUrl: string): string {
    return path.join(path.dirname(fileURLToPath(testFileUrl)), 'files');
}
