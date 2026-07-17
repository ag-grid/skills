/** Renders one project's markdown report from its detection result. */
import * as path from "node:path";
import {
  optionalityOf,
  relevantVersion,
  type Optionality,
} from "./optionality.ts";
import {
  compareVersions,
  type CompiledChange,
  type CompiledChangelog,
  type DetectedChange,
  type Product,
  type ProjectDetectionResult,
  type WrapperFramework,
} from "./types.ts";

/** Occurrences collapse to one line per file; at most this many file lines are listed before the
 *  rest are summarised with a search hint, to keep long match lists from swamping the agent. */
const MAX_OCCURRENCE_FILES = 5;

export const PRODUCT_LABELS: Record<Product, string> = {
  grid: "Grid",
  charts: "Charts",
  studio: "Studio",
};

/** A rendered report: the markdown for the project's own report file, plus any side files (large
 *  mitigations split out for readability) keyed by their file name. */
export interface RenderedReport {
  content: string;
  files: Record<string, string>;
}

/** Threaded through rendering so split-out mitigation files accumulate into one map and share a
 *  single run-wide file-number sequence (so names are unique across every project's report). */
interface RenderContext {
  files: Record<string, string>;
  nextIndex: () => number;
}

/** A fresh 1-based incrementing counter, used to number split-out mitigation files. One counter is
 *  shared across a whole run so names stay unique across projects. */
export function createIndexCounter(): () => number {
  let n = 0;
  return () => ++n;
}

/** The report file name for a project, derived from its path relative to the scan root: every
 *  folder segment from the root down to the project, joined by double dashes (so single dashes
 *  within a folder name stay distinguishable). The root project itself ('.') is just report.md. */
export function reportFileName(relativeProjectPath: string): string {
  if (relativeProjectPath === ".") return "report.md";
  return `report--${relativeProjectPath.split(path.sep).join("--")}.md`;
}

/** The effective target version for a product: an explicit target overrides the changelog's latest
 *  version (the default). */
function targetFor(
  product: Product,
  changelogs: Map<Product, CompiledChangelog>,
  targets: Map<Product, string>,
): string {
  return targets.get(product) ?? changelogs.get(product)!.mostRecentVersion;
}

/** Renders one project's report as markdown; the caller writes `content` to the output folder and
 *  any `files` (split-out large mitigations) alongside it. `targets` gives the effective target
 *  version per product (a product absent from the map defaults to its changelog's latest).
 *  `nextMitigationFileIndex` numbers split-out files; pass one shared counter across a run so names
 *  are unique across projects (the default gives each call its own sequence, which suits tests). */
export function renderReport(
  result: ProjectDetectionResult,
  changelogs: Map<Product, CompiledChangelog>,
  targets: Map<Product, string> = new Map(),
  nextMitigationFileIndex: () => number = createIndexCounter(),
): RenderedReport {
  const ctx: RenderContext = { files: {}, nextIndex: nextMitigationFileIndex };

  const projectDependencies = [
    "# Project Dependencies",
    result.dependencies
      .map(({ product, currentVersion, frameworks }) => {
        const via =
          frameworks.length > 0
            ? frameworks.join(", ")
            : "the vanilla javascript API";
        const target = targetFor(product, changelogs, targets);
        return `- ${PRODUCT_LABELS[product]}: current version ${currentVersion}, target version ${target}, used via ${via}`;
      })
      .join("\n"),
  ];

  const sections = [
    `# Update report for ${path.join(result.projectPath, "package.json")}`,
    "See [summary.md](summary.md) for how to apply these changes.",
    ...projectDependencies,
    "# Changes",
    ...(result.changes.length > 0
      ? renderGroupedChanges(result, changelogs, targets, ctx)
      : ["No relevant changes were detected."]),
  ];
  return { content: sections.join("\n\n") + "\n", files: ctx.files };
}

/** Renders all changes grouped by major version transition (`## Grid v32.x -> v33.x`), with each
 *  change under it (`### <heading>`). Products are iterated in dependency order but not themselves
 *  headed — the transition headings name the product, and most projects use a single product. Each
 *  change carries its own optionality classification inline, so there is no document-level
 *  required/optional split. Grouping uses each change's relevant version given the product's target,
 *  so a transition removed after the target groups by its deprecation. */
function renderGroupedChanges(
  result: ProjectDetectionResult,
  changelogs: Map<Product, CompiledChangelog>,
  targets: Map<Product, string>,
  ctx: RenderContext,
): string[] {
  const parts: string[] = [];
  for (const { product } of result.dependencies) {
    const productChanges = result.changes.filter(
      (change) => change.product === product,
    );
    if (productChanges.length === 0) continue;
    const target = targetFor(product, changelogs, targets);
    const majors = [
      ...new Set(
        productChanges.map((change) =>
          majorOf(relevantVersion(change.change, target)!),
        ),
      ),
    ];
    majors.sort((a, b) => a - b);
    for (const major of majors) {
      parts.push(
        `## ${PRODUCT_LABELS[product]} v${major - 1}.x -> v${major}.x`,
      );
      const inTransition = productChanges
        .filter(
          (change) =>
            majorOf(relevantVersion(change.change, target)!) === major,
        )
        .sort((a, b) =>
          compareVersions(
            relevantVersion(a.change, target)!,
            relevantVersion(b.change, target)!,
          ),
        );
      for (const change of inTransition) {
        parts.push(...renderChange(result, change, target, ctx));
      }
    }
  }
  return parts;
}

function renderChange(
  result: ProjectDetectionResult,
  detected: DetectedChange,
  target: string,
  ctx: RenderContext,
): string[] {
  const { change } = detected;
  const optionality = optionalityOf(change, target);
  // Optional changes are flagged DECISION_REQUIRED so the agent can track which it has actioned.
  const decisionPrefix =
    optionality.level === "MANDATORY" ? "" : "DECISION_REQUIRED ";

  const parts: string[] = [
    `### ${changeHeading(change)}`,
    [
      `- **Type:** ${change.type.toUpperCase()}`,
      `- **Optionality:** ${decisionPrefix}${optionality.level} — ${optionality.statement}`,
    ].join("\n"),
  ];
  const description = changeDescription(change);
  if (description) parts.push(description);
  parts.push(...renderMitigation(result, detected, optionality.level, ctx));
  parts.push(...renderOccurrences(detected));
  return parts;
}

/** The `### ` heading text for a change: the API for transitions, the title for simple changes,
 *  and the dependency constraint for dependency changes. */
function changeHeading(change: CompiledChange): string {
  switch (change.type) {
    case "transition":
      return change.oldApi;
    case "requirement":
    case "behaviour":
    case "style":
      return change.title;
    case "dependency":
      return `${change.dependency} >= ${change.minVersion}`;
  }
}

/** The descriptive prose for a change, built only from fields the record itself carries — never
 *  synthesising version numbers (versions live in the grouping headings and the record's own text). */
function changeDescription(change: CompiledChange): string | undefined {
  switch (change.type) {
    case "transition": {
      const sentences: string[] = [];
      if (change.oldDescription) sentences.push(change.oldDescription);
      if (change.newApi !== null) {
        sentences.push(`Use ${change.newApi} instead.`);
      } else {
        sentences.push("It has no replacement.");
      }
      if (change.newDescription) sentences.push(change.newDescription);
      return sentences.join(" ");
    }
    case "requirement":
    case "behaviour":
    case "style":
      return change.description ?? undefined;
    case "dependency":
      return change.reason ?? undefined;
  }
}

/** The parenthetical on the Mitigation line, describing what applying the mitigation does. For a
 *  DISCARD_TO_ACCEPT change the new behaviour is already the default, so the mitigation restores
 *  the old behaviour; for MITIGATE_TO_ACCEPT it adopts the (still optional) change; for MANDATORY
 *  it is simply the steps to complete the update. */
function mitigationLabel(level: Optionality): string {
  switch (level) {
    case "MANDATORY":
      return "Mitigation (apply these steps to complete this update)";
    case "MITIGATE_TO_ACCEPT":
      return "Mitigation (apply to adopt this change)";
    case "DISCARD_TO_ACCEPT":
      return "Mitigation (apply these steps to restore the old behaviour)";
  }
}

/** The applicable mitigation line, or nothing. Mitigation entries are filtered to those that apply
 *  to this project (frameworks null = applies to all, else must intersect the project's frameworks
 *  plus the vanilla javascript API) and combined. A single-line result is inlined after the label;
 *  a multi-line result (any content with its own paragraphs or, necessarily, more than one entry)
 *  is split into a standalone file — keeping the report outline clean and letting the agent gauge
 *  effort from the word count before opening it. Dependency changes carry no mitigation. */
function renderMitigation(
  result: ProjectDetectionResult,
  detected: DetectedChange,
  level: Optionality,
  ctx: RenderContext,
): string[] {
  const { change } = detected;
  if (change.type === "dependency") return [];
  const projectFrameworks: (WrapperFramework | "javascript")[] = [
    "javascript",
    ...(result.dependencies.find(({ product }) => product === detected.product)
      ?.frameworks ?? []),
  ];
  const applicable = change.mitigation.filter(
    (entry) =>
      entry.frameworks === null ||
      entry.frameworks.some((framework) =>
        projectFrameworks.includes(framework),
      ),
  );
  const content = applicable
    .map((entry) => entry.content)
    .join("\n\n")
    .trim();
  if (content === "") return [];
  const label = mitigationLabel(level);
  if (!content.includes("\n")) return [`${label}: ${content}`];

  const heading = changeHeading(change);
  const filename = `${ctx.nextIndex()}-${slugify(heading)}.md`;
  ctx.files[filename] = `# Mitigation: ${heading}\n\n${content}\n`;
  const words = content.split(/\s+/).filter(Boolean).length;
  return [`${label}: ${words} word guide in [${filename}](${filename})`];
}

/** A file name slug for a split-out mitigation: the first 50 characters of the change heading, with
 *  non-word/non-space characters removed and spaces collapsed to hyphens. Falls back to
 *  "mitigation" if nothing usable remains. Uniqueness comes from the numeric prefix, not the slug. */
function slugify(title: string): string {
  const slug = title
    .slice(0, 50)
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
  return slug || "mitigation";
}

/** The "Detected in" block: one line per file (line numbers omitted), listing the distinct matched
 *  strings found in that file, quoted. At most MAX_OCCURRENCE_FILES files are listed; any remaining
 *  files are summarised with a search hint naming the distinct matched strings, so a long match list
 *  cannot swamp the agent's context. A change with no occurrences (e.g. one with no detectWords)
 *  gets no block at all — nothing was found to point at. */
function renderOccurrences(detected: DetectedChange): string[] {
  const occurrences = detected.occurrences;
  if (occurrences.length === 0) return [];

  const wordsByFile = new Map<string, Set<string>>();
  for (const { file, word } of occurrences) {
    let words = wordsByFile.get(file);
    if (!words) {
      words = new Set();
      wordsByFile.set(file, words);
    }
    words.add(word);
  }

  const files = [...wordsByFile];
  const lines = files
    .slice(0, MAX_OCCURRENCE_FILES)
    .map(
      ([file, words]) =>
        `- ${file} (${[...words].map((word) => `"${word}"`).join(", ")})`,
    );
  if (files.length > MAX_OCCURRENCE_FILES) {
    const more = files.length - MAX_OCCURRENCE_FILES;
    const distinctWords = [...new Set(occurrences.map((o) => o.word))]
      .map((word) => `\`${word}\``)
      .join(", ");
    lines.push(
      `- ... and ${more} more ${more === 1 ? "file" : "files"}, search for ${distinctWords} to find them all`,
    );
  }
  return [["Detected in:", "", ...lines].join("\n")];
}

function majorOf(version: string): number {
  return parseInt(version.split(".")[0], 10);
}
