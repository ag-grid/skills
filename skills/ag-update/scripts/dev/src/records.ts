/** Downloads the compiled change records for the products in use. */
import * as fs from 'node:fs/promises';
import { ExitWithError } from './output.ts';
import { localSkillVersion, newerSkillVersionError } from './skill-version.ts';
import { compareVersions, type CompiledChangelog, type Product } from './types.ts';

const CHANGELOG_PATHS: Record<Product, string> = {
    grid: 'version-change-records.json',
    charts: 'charts/version-change-records.json',
    studio: 'studio/version-change-records.json',
};

/** The URL a product's changelog is downloaded from; exported so tests mock the exact same URLs. */
export function changelogUrl(prefix: string, product: Product): string {
    return `${prefix.replace(/\/$/, '')}/${CHANGELOG_PATHS[product]}`;
}

/** Downloads one changelog per product in use; throws ExitWithError on download/JSON-parse failure
 *  or when a changelog's minimumSkillVersion exceeds the local skill version. */
export async function downloadChangeRecords(
    prefix: string,
    products: Product[]
): Promise<Map<Product, CompiledChangelog>> {
    const changelogs = new Map<Product, CompiledChangelog>();
    for (const product of products) {
        const url = changelogUrl(prefix, product);
        let changelog: CompiledChangelog;
        try {
            changelog = JSON.parse(await downloadText(url));
        } catch {
            throw downloadFailure(url);
        }
        const local = localSkillVersion();
        if (compareVersions(local, changelog.minimumSkillVersion) < 0) {
            // This floor cannot be bypassed with --allow-old-version: the script cannot read the data.
            throw newerSkillVersionError(local, changelog.minimumSkillVersion);
        }
        changelogs.set(product, changelog);
    }
    return changelogs;
}

async function downloadText(url: string): Promise<string> {
    if (url.startsWith('file://')) {
        return fs.readFile(url.slice('file://'.length), 'utf8');
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
}

function downloadFailure(url: string): ExitWithError {
    return new ExitWithError(
        `could not download ${url}. Check if the Internet is enabled by loading a known-good URL, then try again.`,
        [
            'If the Internet is not available, ask the operator to fix the issue.',
            'If downloading fails persistently even though the Internet is available, there may be a bug in the ' +
                'ag-update skill, ask the user to report it as an issue on GitHub: https://github.com/ag-grid/skills/issues',
        ]
    );
}
