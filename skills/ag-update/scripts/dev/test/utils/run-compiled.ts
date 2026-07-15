/** Process-test runner: spawns the real compiled analyse-update.js and returns the result in
 *  the standard snapshot format (exitCode + stderr + stdout, omitting empty sections). */
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from './snapshot';

export const COMPILED_SCRIPT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../analyse-update.js'
);

export interface RunCompiledOptions {
    cwd?: string;
    env?: Record<string, string>;
    /** Run under `npx -y node@{nodeVersion}` instead of the current node, for the version matrix. */
    nodeVersion?: string;
}

export function runCompiled(args: string[], options: RunCompiledOptions = {}): string {
    const [command, commandArgs] = options.nodeVersion
        ? ['npx', ['-y', `node@${options.nodeVersion}`, COMPILED_SCRIPT, ...args]]
        : [process.execPath, [COMPILED_SCRIPT, ...args]];
    const result = spawnSync(command, commandArgs, {
        cwd: options.cwd ?? REPO_ROOT,
        env: { ...process.env, ...options.env },
        encoding: 'utf8',
    });
    let stderr = result.stderr ?? '';
    if (options.nodeVersion) {
        // npx writes package-installation noise to stderr on cold caches; drop it
        stderr = stderr
            .split('\n')
            .filter((line) => !line.startsWith('npm'))
            .join('\n');
    }
    return formatResult(result.status, stderr, result.stdout ?? '');
}

function formatResult(exitCode: number | null, stderr: string, stdout: string): string {
    let formatted = `exitCode: ${exitCode}`;
    if (stderr.trim() !== '') formatted += `\nstderr:\n${stderr}`;
    if (stdout.trim() !== '') formatted += `\nstdout:\n${stdout}`;
    return formatted;
}
