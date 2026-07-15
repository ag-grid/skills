import { afterEach, expect, test } from 'vitest';
import { detectChanges } from '../../../src/detect';
import type { CompiledChange, ProjectInfo } from '../../../src/types';
import { changelog, fixtureFiles, globalTestStateReset, requirement, transition } from '../../utils';

afterEach(globalTestStateReset);

/** The fixture's src/code.js has `oldGridApi` on line 2, `Foo-Bar` on line 3, `FooBar` on line 4. */
const project: ProjectInfo = {
    projectPath: fixtureFiles(import.meta.url),
    relativeProjectPath: 'files',
    dependencies: [{ product: 'grid', currentVersion: '32.0.0', frameworks: [] }],
    blockers: [],
};

function detect(...changes: CompiledChange[]) {
    return detectChanges(project, new Map([['grid', changelog({ changes })]])).changes;
}

test('change with matching detectWords is included with file/line occurrences', () => {
    const detected = detect(transition({ detectWords: ['oldGridApi'] }));
    expect(detected).toHaveLength(1);
    expect(detected[0].occurrences).toEqual([{ file: 'src/code.js', line: 2, word: 'oldGridApi' }]);
});

test('change whose detectWords match nothing is omitted', () => {
    expect(detect(transition({ detectWords: ['absentFromFixture'] }))).toEqual([]);
});

test('change with detectWords null is included with empty occurrences', () => {
    const detected = detect(requirement({ detectWords: null }));
    expect(detected).toHaveLength(1);
    expect(detected[0].occurrences).toEqual([]);
});

test('whole-word matching — word embedded in a larger identifier does not match', () => {
    const detected = detect(transition({ detectWords: ['Bar'] }));
    // `Foo-Bar` (line 3) matches; `FooBar` (line 4) does not
    expect(detected[0].occurrences).toEqual([{ file: 'src/code.js', line: 3, word: 'Bar' }]);
});
