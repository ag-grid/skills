import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { parseArgs } from "./args.ts";
import { detectChanges } from "./detect.ts";
import { findGitRoot } from "./files.ts";
import {
  addNotice,
  ExitWithError,
  render,
  stringifyError,
  succeed,
  type ScriptOutput,
} from "./output.ts";
import { getProjectInfo } from "./project-info.ts";
import { determineRoot, locateProjects } from "./projects.ts";
import { downloadChangeRecords } from "./records.ts";
import {
  createIndexCounter,
  renderReport,
  reportFileName,
  PRODUCT_LABELS,
} from "./report.ts";
import { checkSkillVersion, skillFolder } from "./skill-version.ts";
import { compareVersions } from "./types.ts";
import type { Args } from "./args.ts";
import type { CompiledChangelog, Product, ProjectInfo } from "./types.ts";

/** File name of the static "how to apply an update" guide, shipped in the skill folder. */
const GUIDE_FILE = "applying-updates.md";

const PRODUCT_ORDER: Product[] = ["grid", "charts", "studio"];

/** Parses arguments and runs all stages. Returns the ScriptOutput on success and throws
 *  ExitWithError on every error path (unexpected exceptions are converted to the internal-error
 *  ERROR); never writes to stderr or calls process.exit. This is what integration tests call. */
export async function run(...argv: string[]): Promise<ScriptOutput> {
  try {
    const args = parseArgs(argv);
    await checkSkillVersion(args.allowOldVersion);

    const cwd = process.cwd();
    const root = determineRoot(cwd, args.root, findGitRoot(cwd));
    const projects = locateProjects(root)
      .map((projectPath) => getProjectInfo(projectPath, root, args.sourceGlob))
      // Sort for deterministic output regardless of filesystem-walk order.
      .sort((a, b) =>
        a.relativeProjectPath.localeCompare(b.relativeProjectPath),
      );

    const updatable = projects.filter(
      (p) => p.dependencies.length > 0 && p.blockers.length === 0,
    );
    const blocked = projects.filter((p) => p.blockers.length > 0);
    const noAgDependencies = projects.filter(
      (p) => p.dependencies.length === 0 && p.blockers.length === 0,
    );

    // package.json files were found but none can be updated (all blocked or without AG dependencies).
    // Treated as an error: the user ran the skill expecting updatable projects, so this is likely a
    // wrong --root or an unrecognised set of dependencies, not a clean no-op.
    if (updatable.length === 0)
      throw noUpdateableProjects(root, blocked, noAgDependencies);

    const productsInUse = PRODUCT_ORDER.filter((product) =>
      updatable.some((p) => p.dependencies.some((d) => d.product === product)),
    );
    // Validate the target selection before the network round-trip, so bad targets fail fast.
    validateTargetSelection(args.targetVersions, productsInUse, updatable);

    // Validate the output folder before the network round-trip, so a bad --output-folder fails fast.
    const outputFolder = resolveOutputFolder(cwd, args.outputFolder);

    const changelogs =
      productsInUse.length > 0
        ? await downloadChangeRecords(args.changesUrlPrefix, productsInUse)
        : new Map<Product, CompiledChangelog>();

    // The effective target per product: an explicit --<product>-target-version, else the latest.
    const targets = resolveTargets(
      args.targetVersions,
      productsInUse,
      changelogs,
    );

    const reportFiles: Record<string, string> = {};
    // One counter shared across every project's report so split-out mitigation file names are
    // unique across the whole run, not just within a single report.
    const nextMitigationFileIndex = createIndexCounter();
    for (const project of updatable) {
      const { content, files } = renderReport(
        detectChanges(project, changelogs, args.sourceGlob, targets),
        changelogs,
        targets,
        nextMitigationFileIndex,
      );
      reportFiles[reportFileName(project.relativeProjectPath)] = content;
      Object.assign(reportFiles, files);
    }

    const productVersions = (versionOf: (product: Product) => string): string =>
      productsInUse
        .map((product) => `${PRODUCT_LABELS[product]} v${versionOf(product)}`)
        .join(", ");

    const body: string[] = [
      scannedSection(root, args, projects),
      updatableSection(updatable, targets, outputFolder),
      `Latest available versions: ${productVersions((p) => changelogs.get(p)!.mostRecentVersion)}.`,
      `These reports were generated for target version: ${productVersions((p) => targets.get(p)!)}.`,
      ...blockedSection(blocked),
      ...noAgDependenciesSection(noAgDependencies),
      ...verifySection(args),
      `Once you have verified the above and the reports are correct, follow the update guide to apply them:\n  ${path.join(skillFolder(), GUIDE_FILE)}`,
    ];

    const output = succeed(
      "report files produced",
      body,
      outputFolder,
      reportFiles,
    );
    // summary.md holds the verbatim rendered LLM output, saved for inspection; never written on ERROR.
    output.reportFiles["summary.md"] = render(output);
    return output;
  } catch (e) {
    throw e instanceof ExitWithError ? e : crashError(e);
  }
}

/** Validates the per-product target selection using only local data (no network), so it fails
 *  fast. Enforces: (1) targets set for products no project uses are noted and ignored; (2) an
 *  all-or-nothing rule across products in use — you cannot mix an explicit target with a defaulted
 *  (latest) one, because only the latest versions are guaranteed compatible; (3) no downgrades. */
function validateTargetSelection(
  targetVersions: Partial<Record<Product, string>>,
  productsInUse: Product[],
  updatable: ProjectInfo[],
): void {
  for (const product of PRODUCT_ORDER) {
    if (
      targetVersions[product] !== undefined &&
      !productsInUse.includes(product)
    ) {
      addNotice(
        `--${product}-target-version was given but no scanned project uses ${PRODUCT_LABELS[product]}, so it was ignored`,
      );
    }
  }

  const targeted = productsInUse.filter((p) => targetVersions[p] !== undefined);
  if (targeted.length > 0 && targeted.length < productsInUse.length) {
    const missing = productsInUse.filter(
      (p) => targetVersions[p] === undefined,
    );
    throw new ExitWithError(
      "a target version was set for some but not all of the products in use",
      [
        `Products in use: ${productsInUse.map((p) => PRODUCT_LABELS[p]).join(", ")}. Missing a target version: ${missing.map((p) => PRODUCT_LABELS[p]).join(", ")}.`,
        "Specific product versions only work together in tested combinations; only the latest versions of each product are guaranteed to be compatible. If you set a target version for one product in use, you must set one for every product in use, choosing versions you have confirmed work together.",
        `Invoke the command again setting a target for every product in use (e.g. ${productsInUse.map((p) => `--${p}-target-version=major.minor`).join(" ")}), or set none to target the latest of each.`,
      ],
    );
  }

  for (const project of updatable) {
    for (const dependency of project.dependencies) {
      const target = targetVersions[dependency.product];
      if (
        target !== undefined &&
        compareVersions(target, dependency.currentVersion) < 0
      ) {
        throw new ExitWithError(
          `target version ${target} for ${PRODUCT_LABELS[dependency.product]} is below the current version ${dependency.currentVersion} in ${project.relativeProjectPath}`,
          [
            "This skill only updates forwards. Choose a target version at or above the current version of every project.",
            `Invoke the command again with --${dependency.product}-target-version set to ${dependency.currentVersion} or later.`,
          ],
        );
      }
    }
  }
}

/** Resolves the effective target version per product in use: an explicit target overrides the
 *  changelog's latest (the default). Errors when an explicit target is newer than the latest. */
function resolveTargets(
  targetVersions: Partial<Record<Product, string>>,
  productsInUse: Product[],
  changelogs: Map<Product, CompiledChangelog>,
): Map<Product, string> {
  const targets = new Map<Product, string>();
  for (const product of productsInUse) {
    const latest = changelogs.get(product)!.mostRecentVersion;
    const specified = targetVersions[product];
    if (specified !== undefined && compareVersions(specified, latest) > 0) {
      throw new ExitWithError(
        `target version ${specified} for ${PRODUCT_LABELS[product]} is newer than the latest available version ${latest}`,
        [
          `Choose a target version no newer than the latest available (${PRODUCT_LABELS[product]} v${latest}).`,
          `Invoke the command again with --${product}-target-version set to ${latest} or earlier, or omit it to target the latest.`,
        ],
      );
    }
    targets.set(product, specified ?? latest);
  }
  return targets;
}

/** The "what was scanned" section: the resolved scan root, the source glob (flagged default vs
 *  supplied), and every discovered package.json — so the agent can judge whether the scan was
 *  appropriate before trusting the reports (see the verify step / the update guide). */
function scannedSection(
  root: string,
  args: Args,
  projects: ProjectInfo[],
): string {
  const globNote = args.sourceGlobIsDefault
    ? "(default)"
    : "(supplied via --source-glob)";
  const discovered = projects.map((p) =>
    p.relativeProjectPath === "."
      ? "package.json"
      : `${p.relativeProjectPath}/package.json`,
  );
  return [
    "## What was scanned",
    [
      `- Scan root: ${root}`,
      `- Source files were searched with the glob: ${args.sourceGlob.join(", ")} ${globNote}`,
      `- Discovered ${discovered.length} package.json file${discovered.length === 1 ? "" : "s"}:`,
      ...discovered.map((d) => `  - ${d}`),
    ].join("\n"),
  ].join("\n\n");
}

/** The updatable-projects section: one line per project showing the current and target version
 *  of each product in use and the path to its generated report. */
function updatableSection(
  updatable: ProjectInfo[],
  targets: Map<Product, string>,
  outputFolder: string,
): string {
  const lines = updatable.map((project) => {
    const versions = project.dependencies
      .map(
        (d) =>
          `${PRODUCT_LABELS[d.product]} v${d.currentVersion} -> v${targets.get(d.product)}`,
      )
      .join(", ");
    const reportPath = path.join(
      outputFolder,
      reportFileName(project.relativeProjectPath),
    );
    return `- ${project.relativeProjectPath}: ${versions} (report: ${reportPath})`;
  });
  return ["## Projects to update", lines.join("\n")].join("\n\n");
}

/** The "verify before applying" section: the re-run gates the agent must clear before trusting
 *  the reports. The source-glob gate is only relevant when the glob was defaulted. */
function verifySection(args: Args): string[] {
  const gates: string[] = [];
  if (args.sourceGlobIsDefault) {
    gates.push(
      "Verify the scan. The default source glob was used — check the scan root and the discovered package.json files listed above are the ones you expected, and that the glob covers the file types this codebase uses for source. If not, re-run with an appropriate --root and/or --source-glob.",
    );
  }
  gates.push(
    "Verify the target version. These reports were generated for the target version shown above (the latest of each product unless overridden). To target an earlier version, re-run setting the per-product flag(s) — --grid-target-version, --charts-target-version, --studio-target-version — as major.minor (e.g. --grid-target-version=34.2). Note: if a project uses several products and you set a target for one, you must set one for all of them, using versions you have confirmed are compatible.",
  );
  return [
    "## Before applying: verify the reports are correct",
    gates.map((gate, i) => `${i + 1}. ${gate}`).join("\n\n"),
  ];
}

/** The blocked-projects section (heading + list), shared by the SUCCESS summary and the
 *  no-updatable-projects ERROR; empty when there are no blocked projects. */
function blockedSection(blocked: ProjectInfo[]): string[] {
  if (blocked.length === 0) return [];
  return [
    "The following projects use an AG product but cannot be updated by this skill:",
    blocked
      .map(
        (project) =>
          `- ${project.relativeProjectPath}: ${project.blockers.map((b) => b.reason).join("; ")}`,
      )
      .join("\n"),
  ];
}

/** The no-AG-dependencies section (heading + list), shared like blockedSection. */
function noAgDependenciesSection(noAgDependencies: ProjectInfo[]): string[] {
  if (noAgDependencies.length === 0) return [];
  return [
    "The following projects contain no AG dependencies and were not analysed:",
    noAgDependencies
      .map((project) => `- ${project.relativeProjectPath}`)
      .join("\n"),
  ];
}

/** Resolves the output folder from --output-folder (validated up front so integration tests see
 *  the ERROR) or a fresh temp folder. A user-specified folder must be empty and writable; the
 *  temp default is always both. The wrapper still writes and catches genuine write-time failures. */
function resolveOutputFolder(
  cwd: string,
  outputFolderArg: string | undefined,
): string {
  if (outputFolderArg === undefined)
    return fs.mkdtempSync(path.join(os.tmpdir(), "ag-update-"));
  const outputFolder = path.resolve(cwd, outputFolderArg);
  if (fs.existsSync(outputFolder)) {
    if (
      fs.statSync(outputFolder).isDirectory() &&
      fs.readdirSync(outputFolder).length > 0
    ) {
      throw new ExitWithError(`output folder ${outputFolder} is not empty`, [
        "Invoke the command again passing --output-folder=path and selecting an empty or new folder, so the reports do not overwrite existing files.",
      ]);
    }
    assertWritable(outputFolder, outputFolder);
  } else {
    assertWritable(path.dirname(outputFolder), outputFolder);
  }
  return outputFolder;
}

function assertWritable(pathToCheck: string, outputFolder: string): void {
  try {
    fs.accessSync(pathToCheck, fs.constants.W_OK);
  } catch {
    throw couldNotWriteError(outputFolder);
  }
}

/** ERROR raised when the output folder cannot be written to; shared by run()'s up-front check
 *  and the bin wrapper's write-time catch. */
export function couldNotWriteError(outputFolder: string): ExitWithError {
  return new ExitWithError(`could not write to ${outputFolder}`, [
    "Invoke the command again passing --output-folder=path and selecting a path that the script will be able to write to",
  ]);
}

/** ERROR raised when package.json projects were found under the root but none are updatable. */
function noUpdateableProjects(
  root: string,
  blocked: ProjectInfo[],
  noAgDependencies: ProjectInfo[],
): ExitWithError {
  const body: string[] = [
    ...blockedSection(blocked),
    ...noAgDependenciesSection(noAgDependencies),
    'Check that --root points at the intended folder and that the projects depend on AG Grid, AG Charts or AG Studio. To scan a different folder, invoke the command again passing --root="path".',
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
 *  numbers, with paths stripped before /ag-update/, so that snapshot tests work. The marker
 *  matches both the compiled bundle (skills/ag-update/scripts/) and the source tree
 *  (dev/ag-update/src/). Frames outside the skill (node internals, which vary by Node version)
 *  are dropped. */
export function formatCrashDetails(e: unknown): string {
  const lines = [stringifyError(e)];
  if (!(e instanceof Error)) return lines[0];
  for (const frame of (e.stack ?? "").split("\n").slice(1)) {
    const parsed = frame.match(
      /^\s*at\s+(?:(.+?)\s+\()?([^()]*?)(?::\d+:\d+)?\)?$/,
    );
    if (!parsed) continue;
    const [, functionName, framePath] = parsed;
    const skillIndex = framePath.indexOf("/ag-update/");
    if (skillIndex === -1) continue;
    const shortPath = framePath.slice(skillIndex);
    lines.push(
      functionName
        ? `  at ${functionName} (${shortPath})`
        : `  at ${shortPath}`,
    );
  }
  return lines.join("\n");
}
