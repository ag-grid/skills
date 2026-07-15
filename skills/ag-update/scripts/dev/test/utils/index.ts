/** The test utility library. Every test file imports from here and registers
 *  `afterEach(globalTestStateReset)`. */
import { ExitWithError, resetNotices, type ScriptOutput } from '../../src/output';
import { resetFetchMock } from './fetch-mock';
import { cleanupTempDirs } from './fs-helpers';

export * from './changelog-builders';
export * from './fetch-mock';
export * from './fs-helpers';
export * from './run-compiled';
export * from './snapshot';

/** Resets all shared mutable test state (fetch mock, notice collector, temp folders).
 *  Call from an afterEach in every test file. */
export function globalTestStateReset(): void {
    resetFetchMock();
    resetNotices();
    cleanupTempDirs();
}

/** Awaits a runCli call that is expected to fail, returning the ERROR output it threw. */
export async function expectExitWithError(run: Promise<unknown>): Promise<ScriptOutput> {
    try {
        await run;
    } catch (e) {
        if (e instanceof ExitWithError) return e.output;
        throw e;
    }
    throw new Error('expected the run to throw ExitWithError, but it succeeded');
}
