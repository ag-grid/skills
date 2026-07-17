import { afterEach, expect, test } from "vitest";
import { renderReport } from "../src/report";
import type {
  CompiledChangelog,
  CompiledSimpleChange,
  DetectedChange,
  Product,
  ProjectDetectionResult,
} from "../src/types";
import {
  changelog,
  dependencyChange,
  globalTestStateReset,
  mitigation,
  simpleChange,
  transition,
} from "./utils";

afterEach(globalTestStateReset);

// Named simple-change builders with example titles, local to the one test file that asserts on them.
const requirement = (o: Partial<CompiledSimpleChange> = {}) =>
  simpleChange("requirement", {
    title: "sizeColumnsToFit now requires a params object",
    ...o,
  });
const behaviourChange = (o: Partial<CompiledSimpleChange> = {}) =>
  simpleChange("behaviour", {
    title: "rows are now sorted stably by default",
    ...o,
  });
const styleChange = (o: Partial<CompiledSimpleChange> = {}) =>
  simpleChange("style", {
    title: "default row height reduced from 28px to 26px",
    ...o,
  });

function gridAndChartsProject(
  changes: DetectedChange[],
): ProjectDetectionResult {
  return {
    projectPath: "/repo/app",
    relativeProjectPath: "app",
    dependencies: [
      { product: "grid", currentVersion: "32.1.0", frameworks: ["react"] },
      { product: "charts", currentVersion: "10.1.0", frameworks: [] },
    ],
    blockers: [],
    changes,
  };
}

const changelogs = new Map<Product, CompiledChangelog>([
  ["grid", changelog({ mostRecentVersion: "34.0.0" })],
  ["charts", changelog({ mostRecentVersion: "12.0.0" })],
]);

test("report groups changes by product and version transition", () => {
  const { content: report } = renderReport(
    gridAndChartsProject([
      {
        product: "grid",
        change: transition({
          oldApi: "oldGridApi",
          removedFrom: "33.0.0",
          mitigation: [
            mitigation(
              "Replace calls to `oldGridApi()` with `api.newGridApi()`.",
            ),
          ],
        }),
        occurrences: [{ file: "src/main.js", line: 4, word: "oldGridApi" }],
      },
      {
        product: "grid",
        change: requirement({
          version: "34.0.0",
          description: "Pass a params object instead.",
        }),
        occurrences: [],
      },
      {
        product: "charts",
        change: behaviourChange({
          version: "11.0.0",
          title: "legends now paginate by default",
        }),
        occurrences: [],
      },
    ]),
    changelogs,
  );
  expect(report).toMatchInlineSnapshot(`
    "# Update report for /repo/app/package.json

    See [summary.md](summary.md) for how to apply these changes.

    # Project Dependencies

    - Grid: current version 32.1.0, target version 34.0.0, used via react
    - Charts: current version 10.1.0, target version 12.0.0, used via the vanilla javascript API

    # Changes

    ## Grid v32.x -> v33.x

    ### oldGridApi

    - **Type:** TRANSITION
    - **Optionality:** MANDATORY — old API removed

    Use api.newGridApi instead.

    Mitigation (apply these steps to complete this update): Replace calls to \`oldGridApi()\` with \`api.newGridApi()\`.

    Detected in:

    - src/main.js ("oldGridApi")

    ## Grid v33.x -> v34.x

    ### sizeColumnsToFit now requires a params object

    - **Type:** REQUIREMENT
    - **Optionality:** MANDATORY — new requirement; no option to restore old behaviour

    Pass a params object instead.

    ## Charts v10.x -> v11.x

    ### legends now paginate by default

    - **Type:** BEHAVIOUR
    - **Optionality:** MANDATORY — there is no documented flag to restore the old behaviour
    "
  `);
});

test("each change renders its type and optionality inline (mandatory vs decision-required)", () => {
  const { content: report } = renderReport(
    gridAndChartsProject(
      [
        transition({ oldApi: "oldGridApi", removedFrom: "33.0.0" }),
        requirement(),
        dependencyChange({ dependency: "react", minVersion: "18.0.0" }),
        behaviourChange({ mitigation: [mitigation("set the flag")] }),
        styleChange({ mitigation: [mitigation("override the CSS")] }),
      ].map((change) => ({
        product: "grid" as const,
        change,
        occurrences: [],
      })),
    ),
    changelogs,
  );
  // Mandatory changes carry the type and a MANDATORY optionality line, no DECISION_REQUIRED flag.
  expect(report).toContain("### oldGridApi");
  expect(report).toContain("- **Type:** TRANSITION");
  expect(report).toContain("- **Optionality:** MANDATORY — old API removed");
  expect(report).toContain(`### ${requirement().title}`);
  expect(report).toContain("- **Type:** REQUIREMENT");
  expect(report).toContain("### react >= 18.0.0");
  expect(report).toContain("- **Type:** DEPENDENCY");
  // Optional (mitigatable) behaviour/style changes are DECISION_REQUIRED DISCARD_TO_ACCEPT.
  expect(report).toContain(`### ${behaviourChange().title}`);
  expect(report).toContain(
    "- **Optionality:** DECISION_REQUIRED DISCARD_TO_ACCEPT — follow mitigation advice to restore old behaviour",
  );
  expect(report).toContain(`### ${styleChange().title}`);
  expect(report).toContain(
    "- **Optionality:** DECISION_REQUIRED DISCARD_TO_ACCEPT — follow mitigation advice to restore the previous appearance",
  );
});

test("mitigation entries are filtered to the product's frameworks plus javascript", () => {
  // gridAndChartsProject uses grid via react, so only the react and javascript entries apply.
  // Two applicable entries combine into a multi-line body, so the mitigation is split to a file.
  const { content, files } = renderReport(
    gridAndChartsProject([
      {
        product: "grid",
        change: requirement({
          mitigation: [
            mitigation("use the react codemod", ["react"]),
            mitigation("adjust the angular module", ["angular"]),
            mitigation("call the new API directly", ["javascript"]),
          ],
        }),
        occurrences: [],
      },
    ]),
    changelogs,
  );
  const [fileContent] = Object.values(files);
  expect(content).toContain("word guide in");
  expect(fileContent).toContain("use the react codemod");
  expect(fileContent).toContain("call the new API directly");
  expect(fileContent).not.toContain("adjust the angular module");
});

test("a single-line mitigation is inlined; a multi-line one is split into a numbered file", () => {
  const { content, files } = renderReport(
    gridAndChartsProject([
      {
        product: "grid",
        change: transition({
          oldApi: "oldGridApi",
          removedFrom: "33.0.0",
          mitigation: [mitigation("First line.\n\nSecond paragraph here.")],
        }),
        occurrences: [],
      },
    ]),
    changelogs,
  );
  expect(Object.keys(files)).toEqual(["1-oldgridapi.md"]);
  expect(files["1-oldgridapi.md"]).toBe(
    "# Mitigation: oldGridApi\n\nFirst line.\n\nSecond paragraph here.\n",
  );
  // Five whitespace-separated words: "First", "line.", "Second", "paragraph", "here."
  expect(content).toContain(
    "Mitigation (apply these steps to complete this update): 5 word guide in [1-oldgridapi.md](1-oldgridapi.md)",
  );
});

test("occurrences collapse to one line per file with quoted matches; a change with no occurrences gets no Detected in block", () => {
  const { content: report } = renderReport(
    gridAndChartsProject([
      {
        product: "grid",
        change: transition({ oldApi: "gridApiA" }),
        occurrences: [{ file: "src/a.js", line: 10, word: "gridApiA" }],
      },
      {
        product: "grid",
        change: requirement({ detectWords: null }),
        occurrences: [],
      },
    ]),
    changelogs,
  );
  expect(report).toContain('- src/a.js ("gridApiA")');
  // The detectWords-null requirement is still reported, but with no occurrence block.
  expect(report).toContain(`### ${requirement().title}`);
  expect(report).not.toContain("cannot be ruled out");
  expect(report).not.toContain("Detected in: this change");
});

test("occurrences dedupe matched strings per file, and cap at 5 files with a search hint", () => {
  const occurrences = [
    { file: "src/a.tsx", line: 2, word: "ag-grid-community" },
    { file: "src/a.tsx", line: 3, word: "ag-grid-community" },
    { file: "src/a.tsx", line: 4, word: "ag-grid-react" },
    ...Array.from({ length: 5 }, (_, i) => ({
      file: `src/f${i}.tsx`,
      line: 1,
      word: "ag-grid-community",
    })),
  ];
  const { content: report } = renderReport(
    gridAndChartsProject([
      {
        product: "grid",
        change: transition({
          oldApi: "oldGridApi",
          removedFrom: "33.0.0",
          detectWords: ["ag-grid-community", "ag-grid-react"],
        }),
        occurrences,
      },
    ]),
    changelogs,
  );
  // One line per file; matches within a file are deduped and quoted, in first-seen order.
  expect(report).toContain(
    '- src/a.tsx ("ag-grid-community", "ag-grid-react")',
  );
  // Six distinct files, so the first five are listed and the last is summarised with a hint.
  expect(report).not.toContain("src/f4.tsx");
  expect(report).toContain(
    "- ... and 1 more file, search for `ag-grid-community`, `ag-grid-react` to find them all",
  );
});
