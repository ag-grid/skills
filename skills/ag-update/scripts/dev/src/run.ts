import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { parseArgs } from "./args.ts";
import { detectChanges } from "./detect.ts";
import { gitRepoRoot } from "./git.ts";
import { ExitWithError, render, stringifyError, succeed, type ScriptOutput } from "./output.ts";
import { getProjectInfo } from "./project-info.ts";
import { determineRoot, locateProjects } from "./projects.ts";
import { downloadChangeRecords } from "./records.ts";
import { renderReport, reportFileName, PRODUCT_LABELS } from "./report.ts";
import { checkSkillVersion } from "./skill-version.ts";
import type { CompiledChangelog, Product, ProjectInfo } from "./types.ts";

const PRODUCT_ORDER: Product[] = ["grid", "charts", "studio"];

/** Parses arguments and runs all stages. Returns the ScriptOutput on success and throws
 *  ExitWithError on every error path (unexpected exceptions are converted to the internal-error
 *  ERROR); never writes to stderr or calls process.exit. This is what integration tests call. */
export async function run(...argv: string[]): Promise<ScriptOutput> {
  try {
    const args = parseArgs(argv);
    await checkSkillVersion(args.allowOldVersion);

    const cwd = process.cwd();
    const repoRoot = gitRepoRoot(cwd);
    const root = determineRoot(cwd, args.root, repoRoot);
    const projects = locateProjects(root).map((projectPath) => getProjectInfo(projectPath, repoRoot));

    const updatable = projects.filter((p) => p.dependencies.length > 0 && p.blockers.length === 0);
    const blocked = projects.filter((p) => p.blockers.length > 0);
    const noAgDependencies = projects.filter((p) => p.dependencies.length === 0 && p.blockers.length === 0);

    // package.json files were found but none can be updated (all blocked or without AG dependencies).
    // Treated as an error: the user ran the skill expecting updatable projects, so this is likely a
    // wrong --root or an unrecognised set of dependencies, not a clean no-op.
    if (updatable.length === 0) throw noUpdateableProjects(root, blocked, noAgDependencies);

    const productsInUse = PRODUCT_ORDER.filter((product) =>
      updatable.some((p) => p.dependencies.some((d) => d.product === product)),
    );
    const changelogs =
      productsInUse.length > 0
        ? await downloadChangeRecords(args.changesUrlPrefix, productsInUse)
        : new Map<Product, CompiledChangelog>();

    const outputFolder = args.outputFolder
      ? path.resolve(cwd, args.outputFolder)
      : fs.mkdtempSync(path.join(os.tmpdir(), "ag-update-"));

    const reportFiles: Record<string, string> = {};
    for (const project of updatable) {
      reportFiles[reportFileName(project.projectPath)] = renderReport(detectChanges(project, changelogs), changelogs);
    }

    const body: string[] = [];
    if (productsInUse.length > 0) {
      const latest = productsInUse.map(
        (product) => `${PRODUCT_LABELS[product]} v${changelogs.get(product)!.mostRecentVersion}`,
      );
      body.push(`The latest versions are: ${latest.join(", ")}.`);
    }
    body.push(
      "Discovered the following projects and created update reports:",
      updatable
        .map((project) => {
          const using = project.dependencies.map((d) => `${PRODUCT_LABELS[d.product]} v${d.currentVersion}`).join(", ");
          return `- ${project.projectPath}: using ${using} -> ${path.join(outputFolder, reportFileName(project.projectPath))}`;
        })
        .join("\n"),
      ...blockedSection(blocked),
      ...noAgDependenciesSection(noAgDependencies),
      "Confirm with the user that they want to update to the latest versions. If they choose an earlier version, disregard the report items introduced after the chosen version.",
      "Confirm with the user that this is the correct set of projects to update, and disregard the reports for any projects they do not want to update.",
      "Use your normal planning process and knowledge of the application's structure, coding standards, and development process to plan the change. Take into account the number of changes. If there are a very large number of changes across many files it may make sense to work with the user to plan a phased approach. If there are only a few changes it may be appropriate to apply them in a single phase. Work with the user to make an appropriate plan.",
    );

    const output = succeed("report files produced", body, outputFolder, reportFiles);
    // summary.md holds the verbatim rendered LLM output, saved for inspection; never written on ERROR.
    output.reportFiles["summary.md"] = render(output);
    return output;
  } catch (e) {
    throw e instanceof ExitWithError ? e : crashError(e);
  }
}

/** The blocked-projects section (heading + list), shared by the SUCCESS summary and the
 *  no-updatable-projects ERROR; empty when there are no blocked projects. */
function blockedSection(blocked: ProjectInfo[]): string[] {
  if (blocked.length === 0) return [];
  return [
    "The following projects use an AG product but cannot be updated by this skill:",
    blocked
      .map((project) => `- ${project.projectPath}: ${project.blockers.map((b) => b.reason).join("; ")}`)
      .join("\n"),
  ];
}

/** The no-AG-dependencies section (heading + list), shared like blockedSection. */
function noAgDependenciesSection(noAgDependencies: ProjectInfo[]): string[] {
  if (noAgDependencies.length === 0) return [];
  return [
    "The following projects contain no AG dependencies and were not analysed:",
    noAgDependencies.map((project) => `- ${project.projectPath}`).join("\n"),
  ];
}

/** ERROR raised when package.json projects were found under the root but none are updatable. */
function noUpdateableProjects(root: string, blocked: ProjectInfo[], noAgDependencies: ProjectInfo[]): ExitWithError {
  const body: string[] = [
    ...blockedSection(blocked),
    ...noAgDependenciesSection(noAgDependencies),
    'Check that --root points at the intended folder and that the projects depend on AG Grid, AG Charts or AG Studio (their package.json files must be committed or staged so Git can see them). To scan a different folder, invoke the command again passing --root="path".',
  ];
  return new ExitWithError(`no updatable projects found under ${root}`, body);
}

/** Converts an unexpected (non-ExitWithError) thrown value to the internal-error ERROR output. */
export function crashError(e: unknown): ExitWithError {
  return new ExitWithError(
    "the script terminated because of an internal error, details below. This is a bug in the skill. Please report it as an issue on GitHub: https://github.com/ag-grid/skills/issues",
    [formatCrashDetails(e)],
  );
}

/** Formats a crash with a stack trace that includes function names but not line and column
 *  numbers, with paths stripped before /ag-update/scripts, so that snapshot tests work. Frames
 *  outside the skill (node internals, which vary by Node version) are dropped. */
export function formatCrashDetails(e: unknown): string {
  const lines = [stringifyError(e)];
  if (!(e instanceof Error)) return lines[0];
  for (const frame of (e.stack ?? "").split("\n").slice(1)) {
    const parsed = frame.match(/^\s*at\s+(?:(.+?)\s+\()?([^()]*?)(?::\d+:\d+)?\)?$/);
    if (!parsed) continue;
    const [, functionName, framePath] = parsed;
    const skillIndex = framePath.indexOf("/ag-update/scripts");
    if (skillIndex === -1) continue;
    const shortPath = framePath.slice(skillIndex);
    lines.push(functionName ? `  at ${functionName} (${shortPath})` : `  at ${shortPath}`);
  }
  return lines.join("\n");
}
