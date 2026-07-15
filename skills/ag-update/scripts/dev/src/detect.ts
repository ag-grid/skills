/** Change detection: which changes in the version range may affect a project, evidenced by
 *  detectWords matches from git grep. This stage is dumb: any match — even in a comment — means
 *  the change is included with its occurrences; interpreting matches is the planning agent's job. */
import { grepFixedStrings } from './git.ts';
import {
    compareVersions,
    type CompiledChange,
    type CompiledChangelog,
    type Dependency,
    type DetectedChange,
    type Product,
    type ProjectDetectionResult,
    type ProjectInfo,
} from './types.ts';

/** Runs detection for one project against the downloaded changelogs. */
export function detectChanges(
    project: ProjectInfo,
    changelogs: Map<Product, CompiledChangelog>
): ProjectDetectionResult {
    const changes: DetectedChange[] = [];
    /** Changes with detectWords, pending the single per-project git grep. */
    const wordSearched: DetectedChange[] = [];

    for (const dependency of project.dependencies) {
        const changelog = changelogs.get(dependency.product);
        if (!changelog) continue;
        for (const change of changelog.changes) {
            const candidate = classifyCandidate(change, dependency, changelog.mostRecentVersion);
            if (candidate === 'excluded') continue;
            const detected: DetectedChange = { product: dependency.product, change, occurrences: [] };
            (candidate === 'search' ? wordSearched : changes).push(detected);
        }
    }

    changes.push(...matchDetectWords(project.projectPath, wordSearched));
    return { ...project, changes };
}

type Candidate = 'excluded' | 'included' | 'search';

function classifyCandidate(change: CompiledChange, dependency: Dependency, mostRecentVersion: string): Candidate {
    if (change.type === 'dependency') {
        // No detectWords and no version check: dependency minimums are constraints of the framework
        // wrappers, so a product used via the vanilla API is unaffected.
        const applies =
            change.dependency === 'typescript' ||
            dependency.frameworks.includes(change.dependency as (typeof dependency.frameworks)[number]);
        return applies ? 'included' : 'excluded';
    }
    if (change.framework !== null && !dependency.frameworks.includes(change.framework)) return 'excluded';
    const version = change.type === 'transition' ? change.removedFrom : change.version;
    if (version === null) return 'excluded'; // transition deprecated but not removed by the target version
    const inRange =
        compareVersions(version, dependency.currentVersion) > 0 && compareVersions(version, mostRecentVersion) <= 0;
    if (!inRange) return 'excluded';
    // detectWords null = cannot be ruled out by searching (per the interface contract).
    return change.detectWords === null ? 'included' : 'search';
}

/** Runs one git grep over the combined detectWords of all candidates and returns the candidates
 *  that matched, with their occurrences filled in. */
function matchDetectWords(projectPath: string, candidates: DetectedChange[]): DetectedChange[] {
    const words = new Set(candidates.flatMap((candidate) => detectWordsOf(candidate.change)));
    const hits = grepFixedStrings(projectPath, [...words]);
    const occurrencesByWord = new Map([...words].map((word) => [word, [] as { file: string; line: number }[]]));
    for (const hit of hits) {
        for (const word of words) {
            if (containsWholeWord(hit.content, word)) {
                occurrencesByWord.get(word)!.push({ file: hit.file, line: hit.line });
            }
        }
    }
    // A change is included iff at least one of its detectWords has at least one occurrence.
    return candidates.filter((candidate) => {
        for (const word of detectWordsOf(candidate.change)) {
            for (const { file, line } of occurrencesByWord.get(word)!) {
                candidate.occurrences.push({ file, line, word });
            }
        }
        return candidate.occurrences.length > 0;
    });
}

function detectWordsOf(change: CompiledChange): string[] {
    return change.type === 'dependency' ? [] : (change.detectWords ?? []);
}

const IDENTIFIER_CHAR = /[A-Za-z0-9_$]/;

/** The whole-word rule from the interface contract: a word matches only when not embedded in a
 *  larger identifier (`Bar` matches `Foo-Bar` but not `FooBar`), case-sensitively. */
export function containsWholeWord(content: string, word: string): boolean {
    for (let from = content.indexOf(word); from !== -1; from = content.indexOf(word, from + 1)) {
        const before = content[from - 1];
        const after = content[from + word.length];
        if (
            (before === undefined || !IDENTIFIER_CHAR.test(before)) &&
            (after === undefined || !IDENTIFIER_CHAR.test(after))
        ) {
            return true;
        }
    }
    return false;
}
