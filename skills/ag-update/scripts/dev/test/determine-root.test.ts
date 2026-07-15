import { afterEach, expect, test } from 'vitest';
import { determineRoot } from '../src/projects';
import { globalTestStateReset } from './utils';

afterEach(globalTestStateReset);

test('relative root is resolved relative to cwd', () => {
    expect(determineRoot('/work/dir', 'sub/project', '/repo')).toBe('/work/dir/sub/project');
});

test('absolute root path is supported', () => {
    expect(determineRoot('/work/dir', '/elsewhere/project', '/repo')).toBe('/elsewhere/project');
});

test('Git repo root is used if no root provided', () => {
    expect(determineRoot('/work/dir', undefined, '/repo')).toBe('/repo');
});
