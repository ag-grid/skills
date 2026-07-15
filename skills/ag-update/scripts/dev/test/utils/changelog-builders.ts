/** Builders for CompiledChangelog fixtures with sensible defaults, and helpers wiring built
 *  changelogs to the per-product URLs (mocked fetch for integration tests, file:// on disk for
 *  process tests). */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { changelogUrl } from '../../src/records';
import type {
    CompiledChangelog,
    CompiledDependencyChange,
    CompiledMitigation,
    CompiledSimpleChange,
    CompiledTransition,
    Product,
} from '../../src/types';
import { mockHttpResponse } from './fetch-mock';
import { tempDir } from './fs-helpers';

export function changelog(overrides: Partial<CompiledChangelog> = {}): CompiledChangelog {
    return { mostRecentVersion: '34.0.0', minimumSkillVersion: '1.0.0', changes: [], ...overrides };
}

export function transition(overrides: Partial<CompiledTransition> = {}): CompiledTransition {
    return {
        type: 'transition',
        id: null,
        framework: null,
        detectWords: ['oldGridApi'],
        mitigation: [],
        oldApi: 'oldGridApi',
        oldDescription: null,
        newApi: 'api.newGridApi',
        newDescription: null,
        isSoft: false,
        deprecatedFrom: null,
        removedFrom: '33.0.0',
        ...overrides,
    };
}

export function simpleChange(
    type: CompiledSimpleChange['type'],
    overrides: Partial<CompiledSimpleChange> = {}
): CompiledSimpleChange {
    return {
        type,
        framework: null,
        detectWords: null,
        mitigation: [],
        version: '33.0.0',
        title: `example ${type} change`,
        description: null,
        ...overrides,
    };
}

export function dependencyChange(overrides: Partial<CompiledDependencyChange> = {}): CompiledDependencyChange {
    return { type: 'dependency', version: '33.0.0', dependency: 'react', minVersion: '18.0.0', reason: null, ...overrides };
}

export function mitigation(content: string, frameworks: CompiledMitigation['frameworks'] = ['react', 'angular', 'vue', 'javascript']): CompiledMitigation {
    return { frameworks, content };
}

/** Registers fetch mocks serving each product's changelog at its URL under the prefix
 *  (defaulting to the script's real default prefix, so tests need pass no extra argument). */
export function serveChangelogs(
    changelogs: Partial<Record<Product, CompiledChangelog>>,
    prefix = 'https://ag-grid.com/'
): void {
    for (const [product, log] of Object.entries(changelogs)) {
        mockHttpResponse(changelogUrl(prefix, product as Product), JSON.stringify(log));
    }
}

/** Writes each product's changelog into a temp folder in the served layout and returns the
 *  file:// prefix to pass as --changes-url-prefix; for process tests, which can't mock fetch. */
export function writeChangelogsToDisk(changelogs: Partial<Record<Product, CompiledChangelog>>): string {
    const prefix = `file://${tempDir()}`;
    for (const [product, log] of Object.entries(changelogs)) {
        const filePath = changelogUrl(prefix, product as Product).slice('file://'.length);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(log));
    }
    return prefix;
}
