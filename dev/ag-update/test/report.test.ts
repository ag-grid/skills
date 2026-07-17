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
  const report = renderReport(
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
    "# AG dependency update report

    This file contains a list of changes to apply to the project described in the Scope section
    below. Combine it with your knowledge of the coding conventions and verification tools
    available for this project to plan and execute an update. After applying these changes use
    the appropriate tools at your disposal to validate that the changes were successful, such as
    running the build, typechecking, tests, and starting the dev server and accessing it with a
    browser.

    # Scope

    - Project path: app
    - Grid: current version 32.1.0, target version 34.0.0, used via react
    - Charts: current version 10.1.0, target version 12.0.0, used via the vanilla javascript API

    # Required changes

    ## Grid

    ### Grid v32.x -> v33.x

    #### REMOVED: oldGridApi

    As of v33.0.0, oldGridApi has been removed. Use api.newGridApi instead.

    Mitigation: Replace calls to \`oldGridApi()\` with \`api.newGridApi()\`.

    Detected in:

    - src/main.js:4 (oldGridApi)

    ### Grid v33.x -> v34.x

    #### REQUIRED: sizeColumnsToFit now requires a params object

    Pass a params object instead.

    Detected in: this change cannot be ruled out by searching the source code; check whether it applies to this project during planning.

    # Optional changes

    The changes in this section are optional: the project will still work if they are accepted as-is. Resolve each decision below with the user while planning the update.

    ## Charts

    ### Charts v10.x -> v11.x

    #### DECISION: legends now paginate by default

    Mitigation: none — this change can only be accepted.

    Detected in: this change cannot be ruled out by searching the source code; check whether it applies to this project during planning.

    TODO add style changes and advice on QA based on style and behaviour changes
    "
  `);
});

test("requirement/removal/dependency changes appear under Required changes; behaviour/style under Optional changes", () => {
  const report = renderReport(
    gridAndChartsProject(
      [
        transition({ oldApi: "oldGridApi" }),
        requirement(),
        dependencyChange({ dependency: "react", minVersion: "18.0.0" }),
        behaviourChange(),
        styleChange(),
      ].map((change) => ({
        product: "grid" as const,
        change,
        occurrences: [],
      })),
    ),
    changelogs,
  );
  const requiredSection = report.slice(
    report.indexOf("# Required changes"),
    report.indexOf("# Optional changes"),
  );
  const optionalSection = report.slice(report.indexOf("# Optional changes"));
  expect(requiredSection).toContain("#### REMOVED: oldGridApi");
  expect(requiredSection).toContain(`#### REQUIRED: ${requirement().title}`);
  expect(requiredSection).toContain("#### DEPENDENCY: react >= 18.0.0");
  expect(optionalSection).toContain(
    `#### DECISION: ${behaviourChange().title}`,
  );
  expect(optionalSection).toContain(`#### DECISION: ${styleChange().title}`);
});

test("mitigation entries are filtered to the product's frameworks plus javascript", () => {
  // gridAndChartsProject uses grid via react, so only the react and javascript entries apply.
  const report = renderReport(
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
  expect(report).toContain("use the react codemod");
  expect(report).toContain("call the new API directly");
  expect(report).not.toContain("adjust the angular module");
});

test("occurrences are listed with file and line; detectWords-null changes get the cannot-rule-out sentence", () => {
  const report = renderReport(
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
  expect(report).toContain("- src/a.js:10 (gridApiA)");
  expect(report).toContain(
    "this change cannot be ruled out by searching the source code",
  );
});
