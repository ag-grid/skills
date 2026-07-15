/** Skill version handling: the local VERSION.md and the released-version check. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { addNotice, ExitWithError } from './output.ts';
import { compareVersions } from './types.ts';

export const RELEASED_VERSION_URL =
    'https://raw.githubusercontent.com/ag-grid/skills/main/skills/ag-update/VERSION.md';

/** Reads the local skill version from VERSION.md in the skill folder, found by walking up from
 *  this file (which lives at scripts/dev/src/ in source form and scripts/ once compiled). */
export function localSkillVersion(): string {
    // __dirname in the compiled CJS bundle; the import.meta fallback is for vitest's ESM
    // transform and is unreachable in the bundle (build.mjs silences the resulting warning).
    let dir = typeof __dirname !== 'undefined' ? __dirname : new URL('.', import.meta.url).pathname;
    for (let i = 0; i < 4; i++) {
        const candidate = path.join(dir, 'VERSION.md');
        if (fs.existsSync(candidate)) {
            return fs.readFileSync(candidate, 'utf8').trim();
        }
        dir = path.dirname(dir);
    }
    throw new Error(`VERSION.md not found in any folder above ${__dirname}`);
}

/** The "newer skill version available" ERROR, shared with the minimumSkillVersion check in records.ts. */
export function newerSkillVersionError(current: string, newVersion: string): ExitWithError {
    return new ExitWithError(
        `a new version of this skill is available. Current version ${current}; new version ${newVersion}.`,
        [
            'Tell the user that they are recommended to update the skill by running `npx skills update ' +
                'ag-grid/skills`, but alternatively may choose to continue running this outdated version.',
            'Stop and wait for the user to respond. If they ask to continue using this version, invoke the ' +
                'script again adding the --allow-old-version argument.',
        ]
    );
}

/** Resolves normally when OK to continue; throws ExitWithError when a newer skill version is available. */
export async function checkSkillVersion(allowOldVersion: boolean): Promise<void> {
    if (allowOldVersion) return;
    const local = localSkillVersion();
    let released: string;
    try {
        const response = await fetch(RELEASED_VERSION_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        released = (await response.text()).trim();
    } catch {
        addNotice(
            `currently using ag-update v${local}, could not fetch ${RELEASED_VERSION_URL} to check if a newer version exists`
        );
        return;
    }
    if (compareVersions(released, local) > 0) {
        throw newerSkillVersionError(local, released);
    }
}
