/** Renders one project's markdown report from its detection result. */
import {
    compareVersions,
    type CompiledChange,
    type CompiledChangelog,
    type DetectedChange,
    type Product,
    type ProjectDetectionResult,
    type WrapperFramework,
} from './types.ts';

const PREAMBLE = `# AG dependency update report

This file contains a list of changes to apply to the project described in the Scope section
below. Combine it with your knowledge of the coding conventions and verification tools
available for this project to plan and execute an update. After applying these changes use
the appropriate tools at your disposal to validate that the changes were successful, such as
running the build, typechecking, tests, and starting the dev server and accessing it with a
browser.`;

const OPTIONAL_INTRO =
    'The changes in this section are optional: the project will still work if they are accepted as-is. Resolve each decision below with the user while planning the update.';

const CANNOT_RULE_OUT =
    'Detected in: this change cannot be ruled out by searching the source code; check whether it applies to this project during planning.';

export const PRODUCT_LABELS: Record<Product, string> = { grid: 'Grid', charts: 'Charts', studio: 'Studio' };

/** The report file name for a project folder. */
export function reportFileName(projectPath: string): string {
    return `${projectPath.split('/').filter(Boolean).pop()}-report.md`;
}

/** Renders one project's report as markdown; the caller writes it to the output folder. */
export function renderReport(result: ProjectDetectionResult, changelogs: Map<Product, CompiledChangelog>): string {
    const scope = [
        '# Scope',
        [
            `- Project path: ${result.relativeProjectPath}`,
            ...result.dependencies.map(({ product, currentVersion, frameworks }) => {
                const via = frameworks.length > 0 ? frameworks.join(', ') : 'the vanilla javascript API';
                const target = changelogs.get(product)?.mostRecentVersion;
                return `- ${PRODUCT_LABELS[product]}: current version ${currentVersion}, target version ${target}, used via ${via}`;
            }),
        ].join('\n'),
    ];

    const required = result.changes.filter((c) => c.change.type !== 'behaviour' && c.change.type !== 'style');
    const optional = result.changes.filter((c) => c.change.type === 'behaviour' || c.change.type === 'style');

    const sections = [
        PREAMBLE,
        ...scope,
        '# Required changes',
        ...(required.length > 0 ? renderGroupedChanges(result, required) : ['No required changes were detected.']),
        '# Optional changes',
        ...(optional.length > 0
            ? [OPTIONAL_INTRO, ...renderGroupedChanges(result, optional)]
            : ['No optional changes were detected.']),
    ];
    return sections.join('\n\n') + '\n';
}

/** Renders changes grouped by product (`## Grid`) then by major version transition
 *  (`### Grid v32.x -> v33.x`), so items after a user-chosen earlier version can be
 *  disregarded wholesale by skipping later transition sections. */
function renderGroupedChanges(result: ProjectDetectionResult, changes: DetectedChange[]): string[] {
    const parts: string[] = [];
    for (const { product } of result.dependencies) {
        const productChanges = changes.filter((change) => change.product === product);
        if (productChanges.length === 0) continue;
        parts.push(`## ${PRODUCT_LABELS[product]}`);
        const majors = [...new Set(productChanges.map((change) => majorOf(changeVersion(change.change))))];
        majors.sort((a, b) => a - b);
        for (const major of majors) {
            parts.push(`### ${PRODUCT_LABELS[product]} v${major - 1}.x -> v${major}.x`);
            const inTransition = productChanges
                .filter((change) => majorOf(changeVersion(change.change)) === major)
                .sort((a, b) => compareVersions(changeVersion(a.change), changeVersion(b.change)));
            for (const change of inTransition) {
                parts.push(...renderChange(result, change));
            }
        }
    }
    return parts;
}

function renderChange(result: ProjectDetectionResult, detected: DetectedChange): string[] {
    const { change } = detected;
    const parts: string[] = [];
    switch (change.type) {
        case 'transition': {
            parts.push(`#### REMOVED: ${change.oldApi}`);
            const sentences = [`As of v${change.removedFrom}, ${change.oldApi} has been removed.`];
            if (change.oldDescription) sentences.push(change.oldDescription);
            if (change.newApi !== null) {
                sentences.push(`Use ${change.newApi} instead.`);
                if (change.newDescription) sentences.push(change.newDescription);
            } else {
                sentences.push('It has no replacement.');
            }
            parts.push(sentences.join(' '));
            break;
        }
        case 'requirement':
            parts.push(`#### REQUIRED: ${change.title}`);
            if (change.description) parts.push(change.description);
            break;
        case 'behaviour':
        case 'style':
            parts.push(`#### DECISION: ${change.title}`);
            if (change.description) parts.push(change.description);
            break;
        case 'dependency':
            parts.push(`#### DEPENDENCY: ${change.dependency} >= ${change.minVersion}`);
            if (change.reason) parts.push(change.reason);
            break;
    }
    parts.push(...renderMitigation(result, detected), renderOccurrences(detected));
    return parts;
}

/** The record's mitigation entries whose frameworks intersect the product's frameworks plus
 *  'javascript'. For decisions, mitigation is the way to restore the old behaviour; none
 *  applying = accept-only. For other changes the line is simply omitted when none apply. */
function renderMitigation(result: ProjectDetectionResult, detected: DetectedChange): string[] {
    const { change } = detected;
    if (change.type === 'dependency') return [];
    const frameworks: (WrapperFramework | 'javascript')[] = [
        'javascript',
        ...(result.dependencies.find(({ product }) => product === detected.product)?.frameworks ?? []),
    ];
    const applicable = change.mitigation.filter((entry) =>
        entry.frameworks.some((framework) => frameworks.includes(framework))
    );
    if (applicable.length === 0) {
        const acceptOnly = change.type === 'behaviour' || change.type === 'style';
        return acceptOnly ? ['Mitigation: none — this change can only be accepted.'] : [];
    }
    return [`Mitigation: ${applicable.map((entry) => entry.content).join('\n\n')}`];
}

function renderOccurrences(detected: DetectedChange): string {
    if (detected.occurrences.length === 0) return CANNOT_RULE_OUT;
    const lines = detected.occurrences.map(({ file, line, word }) => `- ${file}:${line} (${word})`);
    return ['Detected in:', '', ...lines].join('\n');
}

function changeVersion(change: CompiledChange): string {
    return change.type === 'transition' ? change.removedFrom! : change.version;
}

function majorOf(version: string): number {
    return parseInt(version.split('.')[0], 10);
}
