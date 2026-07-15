// version-check must be the first import: it guards the Node version before any other module
// (which may use newer Node APIs) is loaded. --format=cjs ensures imports execute in order.
import './version-check.ts';

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from './args.ts';
import { detectChanges } from './detect.ts';
import { gitRepoRoot } from './git.ts';
import { ExitWithError, render, succeed, type ScriptOutput } from './output.ts';
import { getProjectInfo } from './project-info.ts';
import { determineRoot, locateProjects } from './projects.ts';
import { downloadChangeRecords } from './records.ts';
import { renderReport, reportFileName, PRODUCT_LABELS } from './report.ts';
import { checkSkillVersion } from './skill-version.ts';
import type { CompiledChangelog, Product, ProjectInfo } from './types.ts';

const PRODUCT_ORDER: Product[] = ['grid', 'charts', 'studio'];

/** Runs argument parsing and all stages. Returns the ScriptOutput on success and throws
 *  ExitWithError on every error path (unexpected exceptions are converted to the internal-error
 *  ERROR); never writes to stderr or calls process.exit. This is what integration tests call. */
export async function runCli(...argv: string[]): Promise<ScriptOutput> {
    try {
        return await run(argv);
    } catch (e) {
        throw e instanceof ExitWithError ? e : crashError(e);
    }
}

async function run(argv: string[]): Promise<ScriptOutput> {
    const args = parseArgs(argv);
    await checkSkillVersion(args.allowOldVersion);

    const cwd = process.cwd();
    const repoRoot = gitRepoRoot(cwd);
    const root = determineRoot(cwd, args.root, repoRoot);
    const projects = locateProjects(root).map((projectPath) => getProjectInfo(projectPath, repoRoot));

    const updatable = projects.filter((p) => p.dependencies.length > 0 && p.blockers.length === 0);
    const blocked = projects.filter((p) => p.blockers.length > 0);
    const noAgDependencies = projects.filter((p) => p.dependencies.length === 0 && p.blockers.length === 0);

    const productsInUse = PRODUCT_ORDER.filter((product) =>
        updatable.some((p) => p.dependencies.some((d) => d.product === product))
    );
    const changelogs =
        productsInUse.length > 0
            ? await downloadChangeRecords(args.changesUrlPrefix, productsInUse)
            : new Map<Product, CompiledChangelog>();

    const outputFolder = args.outputFolder
        ? path.resolve(cwd, args.outputFolder)
        : fs.mkdtempSync(path.join(os.tmpdir(), 'ag-update-'));

    const reportFiles: Record<string, string> = {};
    for (const project of updatable) {
        reportFiles[reportFileName(project.projectPath)] = renderReport(detectChanges(project, changelogs), changelogs);
    }

    const output = succeed(
        'report files produced',
        successBody(productsInUse, changelogs, updatable, blocked, noAgDependencies, outputFolder),
        outputFolder,
        reportFiles
    );
    // summary.md holds the verbatim rendered LLM output, saved for inspection; never written on ERROR.
    output.reportFiles['summary.md'] = render(output);
    return output;
}

function successBody(
    productsInUse: Product[],
    changelogs: Map<Product, CompiledChangelog>,
    updatable: ProjectInfo[],
    blocked: ProjectInfo[],
    noAgDependencies: ProjectInfo[],
    outputFolder: string
): string[] {
    const body: string[] = [];
    if (productsInUse.length > 0) {
        const latest = productsInUse.map(
            (product) => `${PRODUCT_LABELS[product]} v${changelogs.get(product)!.mostRecentVersion}`
        );
        body.push(`The latest versions are: ${latest.join(', ')}.`);
    }
    body.push(
        'Discovered the following projects and created update reports:',
        updatable
            .map((project) => {
                const using = project.dependencies
                    .map((d) => `${PRODUCT_LABELS[d.product]} v${d.currentVersion}`)
                    .join(', ');
                return `- ${project.projectPath}: using ${using} -> ${path.join(outputFolder, reportFileName(project.projectPath))}`;
            })
            .join('\n')
    );
    if (blocked.length > 0) {
        body.push(
            'The following projects cannot be updated by this skill and have no report. Tell the user about them and continue:',
            blocked
                .map((project) => `- ${project.projectPath}: ${project.blockers.map((b) => b.reason).join('; ')}`)
                .join('\n')
        );
    }
    if (noAgDependencies.length > 0) {
        body.push(
            'The following projects contain no AG dependencies and were not analysed:',
            noAgDependencies.map((project) => `- ${project.projectPath}`).join('\n')
        );
    }
    body.push(
        'Confirm with the user that they want to update to the latest versions. If they choose an earlier ' +
            'version, disregard the report items introduced after the chosen version.',
        'Confirm with the user that this is the correct set of projects to update, and disregard the reports ' +
            'for any projects they do not want to update.',
        "Use your normal planning process and knowledge of the application's structure, coding standards, and " +
            'development process to plan the change. Take into account the number of changes. If there are a ' +
            'very large number of changes across many files it may make sense to work with the user to plan a ' +
            'phased approach. If there are only a few changes it may be appropriate to apply them in a single ' +
            'phase. Work with the user to make an appropriate plan.'
    );
    return body;
}

/** Converts an unexpected (non-ExitWithError) thrown value to the internal-error ERROR output. */
function crashError(e: unknown): ExitWithError {
    return new ExitWithError(
        'the script terminated because of an internal error, details below. This is a bug in the skill. ' +
            'Please report it as an issue on GitHub: https://github.com/ag-grid/skills/issues',
        [formatCrashDetails(e)]
    );
}

/** Formats a crash with a stack trace that includes function names but not line and column
 *  numbers, with paths stripped before /ag-update/scripts, so that snapshot tests work. Frames
 *  outside the skill (node internals, which vary by Node version) are dropped. */
export function formatCrashDetails(e: unknown): string {
    if (!(e instanceof Error)) return String(e);
    const lines = [`${e.name}: ${e.message}`];
    for (const frame of (e.stack ?? '').split('\n').slice(1)) {
        const parsed = frame.match(/^\s*at\s+(?:(.+?)\s+\()?([^()]*?)(?::\d+:\d+)?\)?$/);
        if (!parsed) continue;
        const [, functionName, framePath] = parsed;
        const skillIndex = framePath.indexOf('/ag-update/scripts');
        if (skillIndex === -1) continue;
        const shortPath = framePath.slice(skillIndex);
        lines.push(functionName ? `  at ${functionName} (${shortPath})` : `  at ${shortPath}`);
    }
    return lines.join('\n');
}

/** The thin bin wrapper: the only code that writes files/stderr and exits. Only covered by
 *  process tests, so it is deliberately minimal. */
function runAsBin(): void {
    process.on('uncaughtException', (e) => exitWith(crashError(e).output));
    process.on('unhandledRejection', (e) => exitWith(crashError(e).output));
    // Undocumented hooks letting process tests trigger the crash handlers in the real script:
    if (process.env.MOCK_EXCEPTION) throw new Error('MOCK_EXCEPTION');
    if (process.env.MOCK_UNHANDLED_REJECTION) void Promise.reject(new Error('MOCK_UNHANDLED_REJECTION'));

    void runCli(...process.argv.slice(2)).then(
        (output) => {
            writeReportFiles(output);
            exitWith(output);
        },
        (e: unknown) => exitWith(e instanceof ExitWithError ? e.output : crashError(e).output)
    );
}

function exitWith(output: ScriptOutput): never {
    process.stderr.write(render(output));
    process.exit(output.status === 'SUCCESS' ? 0 : 1);
}

function writeReportFiles(output: ScriptOutput): void {
    try {
        fs.mkdirSync(output.outputFolder, { recursive: true });
        for (const [name, content] of Object.entries(output.reportFiles)) {
            fs.writeFileSync(path.join(output.outputFolder, name), content);
        }
    } catch {
        exitWith(
            new ExitWithError(`could not write to ${output.outputFolder}`, [
                'Invoke the command again passing --output-folder=path and selecting a path that the script ' +
                    'will be able to write to',
            ]).output
        );
    }
}

// True when this file is the entry point, false when imported by tests. Covers both execution
// modes: the shipped CJS bundle (require.main === module) and the TypeScript source run directly
// via `node --experimental-strip-types src/main.ts` (an ES module, where require/module are
// undefined and entry detection is import.meta.url === the invoked argv path).
const isCjsEntry = typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module;
const isEsmEntry =
    typeof import.meta !== 'undefined' && !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCjsEntry || isEsmEntry) {
    runAsBin();
}
