/** Shared interfaces used across the pipeline stages. */
import type {
    CompiledChange,
    CompiledChangelog,
} from '../../../../../external/ag-website-shared/src/changes/compiled-change-types';

export type { CompiledChange, CompiledChangelog };
export type {
    CompiledDependencyChange,
    CompiledMitigation,
    CompiledSimpleChange,
    CompiledTransition,
} from '../../../../../external/ag-website-shared/src/changes/compiled-change-types';

export type Product = 'grid' | 'charts' | 'studio';

/** Framework wrappers. There is no 'javascript' value: the framework-agnostic core API
 *  applies to every project regardless of wrappers. */
export type WrapperFramework = 'react' | 'angular' | 'vue';

/** One AG product in use by a project (a product may be evidenced by several npm packages). */
export interface Dependency {
    product: Product;
    /** Resolved current version, e.g. "32.1.0" */
    currentVersion: string;
    /** Frameworks this product is used through, evidenced by the product's framework wrapper
     *  packages (ag-grid-react -> 'react', @ag-grid-community/vue3 -> 'vue', ...). A product can
     *  be used through several frameworks; empty = used via the vanilla javascript API only.
     *  Per product, since e.g. studio might be used via React while grid is used vanilla. */
    frameworks: WrapperFramework[];
}

export interface Blocker {
    packageName: string;
    /** Human-readable explanation, surfaced in the report/summary. */
    reason: string;
}

/** Everything discovery knows about one located project. Downstream stages and the SUCCESS
 *  summary derive the three groups from it: `dependencies` empty = no AG dependencies
 *  (no report); `blockers` non-empty = blocked (no report); otherwise updatable (gets a report). */
export interface ProjectInfo {
    projectPath: string;
    /** Project path relative to the Git repo root ('.' for the root itself); used wherever
     *  report content must stay machine-independent. */
    relativeProjectPath: string;
    dependencies: Dependency[];
    /** Conditions that make this project un-updatable by this skill (see blocker rules below). */
    blockers: Blocker[];
}

/** One compiled change that may affect a project. */
export interface DetectedChange {
    product: Product;
    /** The CompiledChange record verbatim (see compiled-change-types.ts: a transition,
     *  simple (requirement | behaviour | style) or dependency change). */
    change: CompiledChange;
    /** Where the change's detectWords matched, from git grep. Empty for dependency changes
     *  and for changes with detectWords: null, which are included without occurrences. */
    occurrences: Occurrence[];
}

export interface Occurrence {
    /** Path relative to the project folder. */
    file: string;
    /** 1-based line number. */
    line: number;
    /** Which of the change's detectWords matched. */
    word: string;
}

/** The full result of the detection stage, input to report generation. */
export interface ProjectDetectionResult extends ProjectInfo {
    changes: DetectedChange[];
}

/** Compares two dotted numeric versions ("34.2.1"); returns <0, 0 or >0. */
export function compareVersions(a: string, b: string): number {
    const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
    const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}
