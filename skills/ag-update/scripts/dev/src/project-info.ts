/** Determines which AG products, versions and frameworks a project uses from its package.json. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Blocker, Dependency, Product, ProjectInfo, WrapperFramework } from './types.ts';

interface PackageRecognition {
    product: Product;
    framework?: WrapperFramework;
}

/** The package recognition table. Phase 1 covers the CURRENT packages only; legacy packages
 *  (scoped modules, `ag-grid`, Vue 2 wrappers) and their blocker rules are phase 2. */
const RECOGNISED_PACKAGES: Record<string, PackageRecognition> = {
    // Grid
    'ag-grid-community': { product: 'grid' },
    'ag-grid-enterprise': { product: 'grid' },
    'ag-grid-react': { product: 'grid', framework: 'react' },
    'ag-grid-angular': { product: 'grid', framework: 'angular' },
    'ag-grid-vue3': { product: 'grid', framework: 'vue' },
    '@ag-grid-community/locale': { product: 'grid' },
    // Charts
    'ag-charts-community': { product: 'charts' },
    'ag-charts-enterprise': { product: 'charts' },
    'ag-charts-react': { product: 'charts', framework: 'react' },
    'ag-charts-angular': { product: 'charts', framework: 'angular' },
    'ag-charts-vue3': { product: 'charts', framework: 'vue' },
    'ag-charts-locale': { product: 'charts' },
    'ag-charts-types': { product: 'charts' },
    'ag-charts-server-side': { product: 'charts' },
    // Studio
    'ag-studio': { product: 'studio' },
    'ag-studio-react': { product: 'studio', framework: 'react' },
    'ag-studio-angular': { product: 'studio', framework: 'angular' },
    'ag-studio-vue3': { product: 'studio', framework: 'vue' },
    'ag-studio-locale': { product: 'studio' },
};

const PRODUCT_ORDER: Product[] = ['grid', 'charts', 'studio'];

export function getProjectInfo(projectPath: string, gitRepoRoot: string): ProjectInfo {
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
    const specs: Record<string, string> = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const byProduct = new Map<Product, { version: string | undefined; frameworks: Set<WrapperFramework> }>();
    const blockers: Blocker[] = [];
    for (const [packageName, spec] of Object.entries(specs)) {
        const recognition = RECOGNISED_PACKAGES[packageName];
        if (!recognition) continue;
        let entry = byProduct.get(recognition.product);
        if (!entry) {
            entry = { version: undefined, frameworks: new Set() };
            byProduct.set(recognition.product, entry);
        }
        entry.version ??= parseConcreteVersion(spec);
        if (recognition.framework) entry.frameworks.add(recognition.framework);
    }

    const dependencies: Dependency[] = [];
    for (const product of PRODUCT_ORDER) {
        const entry = byProduct.get(product);
        if (!entry) continue;
        if (entry.version === undefined) continue; // non-concrete version specs become blockers in phase 2
        dependencies.push({ product, currentVersion: entry.version, frameworks: [...entry.frameworks].sort() });
    }

    return {
        projectPath,
        relativeProjectPath: path.relative(gitRepoRoot, projectPath) || '.',
        dependencies,
        blockers,
    };
}

/** Parses a concrete version out of a version spec by stripping range operators
 *  (`^`, `~`, `>=` etc.); returns undefined for specs with no concrete version ("*", "latest", ...). */
function parseConcreteVersion(spec: string): string | undefined {
    return spec.match(/\d+\.\d+(?:\.\d+)?(?:[-+][\w.-]+)?/)?.[0];
}
