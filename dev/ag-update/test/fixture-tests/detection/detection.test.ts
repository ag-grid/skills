import * as path from "node:path";
import { afterEach, expect, test } from "vitest";
import { detectChanges } from "../../../src/detect";
import { DEFAULT_SOURCE_GLOB } from "../../../src/files";
import type {
  CompiledChange,
  Dependency,
  ProjectInfo,
} from "../../../src/types";
import {
  changelog,
  dependencyChange,
  fixtureFiles,
  globalTestStateReset,
  simpleChange,
  transition,
} from "../../utils";

afterEach(globalTestStateReset);

const FILES = fixtureFiles(import.meta.url);

/** The fixture's src/code.js has `oldGridApi` on line 2, `Foo-Bar` on line 3, `FooBar` on line 4,
 *  `$scope.$apply()` on line 5; a sibling outside/marker.js has `outsideMarker`. */
const project: ProjectInfo = {
  projectPath: FILES,
  relativeProjectPath: "files",
  dependencies: [{ product: "grid", currentVersion: "32.0.0", frameworks: [] }],
  blockers: [],
};

function detect(...changes: CompiledChange[]) {
  return detectChanges(
    project,
    new Map([["grid", changelog({ changes })]]),
    DEFAULT_SOURCE_GLOB,
  ).changes;
}

/** Detect against the fixture with the grid dependency overridden (e.g. different frameworks). */
function detectFor(
  dependency: Partial<Dependency>,
  ...changes: CompiledChange[]
) {
  const overridden = {
    ...project,
    dependencies: [{ ...project.dependencies[0], ...dependency }],
  };
  return detectChanges(
    overridden,
    new Map([["grid", changelog({ changes })]]),
    DEFAULT_SOURCE_GLOB,
  ).changes;
}

/** Detect against the fixture with an explicit grid target version (default changelog latest is
 *  34.0.0, project current is 32.0.0). */
function detectWithTarget(target: string, ...changes: CompiledChange[]) {
  return detectChanges(
    project,
    new Map([["grid", changelog({ changes })]]),
    DEFAULT_SOURCE_GLOB,
    new Map([["grid", target]]),
  ).changes;
}

test("change with matching detectWords is included with file/line occurrences", () => {
  const detected = detect(transition({ detectWords: ["oldGridApi"] }));
  expect(detected).toHaveLength(1);
  expect(detected[0].occurrences).toEqual([
    { file: "src/code.js", line: 2, word: "oldGridApi" },
  ]);
});

test("change whose detectWords match nothing is omitted", () => {
  expect(detect(transition({ detectWords: ["absentFromFixture"] }))).toEqual(
    [],
  );
});

test("change with detectWords null is included with empty occurrences", () => {
  const detected = detect(simpleChange("requirement", { detectWords: null }));
  expect(detected).toHaveLength(1);
  expect(detected[0].occurrences).toEqual([]);
});

test("whole-word matching — word embedded in a larger identifier does not match", () => {
  const detected = detect(transition({ detectWords: ["Bar"] }));
  // `Foo-Bar` (line 3) matches; `FooBar` (line 4) does not
  expect(detected[0].occurrences).toEqual([
    { file: "src/code.js", line: 3, word: "Bar" },
  ]);
});

test("detectWords containing special characters are matched literally", () => {
  // fixed-string search, so the `.`, `$` and `()` are literal, not regex metacharacters.
  const detected = detect(transition({ detectWords: ["$scope.$apply()"] }));
  expect(detected[0].occurrences).toEqual([
    { file: "src/code.js", line: 5, word: "$scope.$apply()" },
  ]);
});

test("changes outside the project's version range are not included", () => {
  // removedFrom 31.0.0 is at or below the project's current 32.0.0, so the change predates it.
  expect(
    detect(transition({ removedFrom: "31.0.0", detectWords: ["oldGridApi"] })),
  ).toEqual([]);
});

test("transition deprecated but not removed is included (optional migration), ranged on deprecatedFrom", () => {
  // Deprecations are surfaced now (they were previously excluded): the old API still works, so
  // migration is optional. Ranged on deprecatedFrom since there is no removedFrom.
  const detected = detect(
    transition({
      removedFrom: null,
      deprecatedFrom: "33.0.0",
      detectWords: null,
    }),
  );
  expect(detected).toHaveLength(1);
  expect(detected[0].change.type).toBe("transition");
});

test("transition deprecated before the project's current version is not included", () => {
  // deprecatedFrom 31.0.0 is at or below the project's current 32.0.0, so it predates this upgrade.
  expect(
    detect(
      transition({
        removedFrom: null,
        deprecatedFrom: "31.0.0",
        detectWords: null,
      }),
    ),
  ).toEqual([]);
});

test("a target below the latest excludes changes introduced after the target", () => {
  const detected = detectWithTarget(
    "33.0",
    transition({
      oldApi: "removedAt33",
      removedFrom: "33.0.0",
      detectWords: null,
    }),
    transition({
      oldApi: "removedAt34",
      removedFrom: "34.0.0",
      detectWords: null,
    }),
  );
  expect(detected).toHaveLength(1);
  const change = detected[0].change;
  if (change.type !== "transition") throw new Error("expected a transition");
  expect(change.oldApi).toBe("removedAt33");
});

test("a transition removed after the target is included via its deprecation version", () => {
  // removedFrom 34.0.0 is after the 33.0 target, so it ranges on deprecatedFrom (33.0.0) and is
  // surfaced (as an optional migration) rather than excluded.
  const detected = detectWithTarget(
    "33.0",
    transition({
      removedFrom: "34.0.0",
      deprecatedFrom: "33.0.0",
      detectWords: null,
    }),
  );
  expect(detected).toHaveLength(1);
});

test("framework-scoped change excluded when the framework is not in the product's frameworks", () => {
  // The base project uses grid via the vanilla API (no frameworks).
  expect(
    detect(
      simpleChange("requirement", { framework: "react", detectWords: null }),
    ),
  ).toEqual([]);
});

test("framework-scoped change included when the product is used through multiple frameworks including it", () => {
  const detected = detectFor(
    { frameworks: ["react", "angular"] },
    simpleChange("requirement", { framework: "react", detectWords: null }),
  );
  expect(detected).toHaveLength(1);
});

test("dependency change included when its dependency is typescript or in the product's frameworks, excluded otherwise", () => {
  expect(detect(dependencyChange({ dependency: "typescript" }))).toHaveLength(
    1,
  );
  // grid used via the vanilla API: a framework-wrapper dependency minimum does not apply.
  expect(detect(dependencyChange({ dependency: "react" }))).toEqual([]);
  expect(
    detectFor(
      { frameworks: ["react"] },
      dependencyChange({ dependency: "react" }),
    ),
  ).toHaveLength(1);
});

test("matches outside a project's folder do not count toward that project", () => {
  // Scope the project to files/src; `outsideMarker` lives in the sibling files/outside/marker.js.
  const scoped = { ...project, projectPath: path.join(FILES, "src") };
  const detected = detectChanges(
    scoped,
    new Map([
      [
        "grid",
        changelog({
          changes: [transition({ detectWords: ["outsideMarker"] })],
        }),
      ],
    ]),
    DEFAULT_SOURCE_GLOB,
  );
  expect(detected.changes).toEqual([]);
});
