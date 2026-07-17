import * as path from "node:path";
import { afterEach, expect, test } from "vitest";
import { DEFAULT_SOURCE_GLOB } from "../../../src/files";
import { getProjectInfo } from "../../../src/project-info";
import type { ProjectInfo } from "../../../src/types";
import { fixtureFiles, globalTestStateReset, REPO_ROOT } from "../../utils";

afterEach(globalTestStateReset);

const FILES = fixtureFiles(import.meta.url);

/** Runs discovery against one committed fixture project folder. */
function info(project: string): ProjectInfo {
  return getProjectInfo(
    path.join(FILES, project),
    REPO_ROOT,
    DEFAULT_SOURCE_GLOB,
  );
}

test("products and versions detected when standard packages used", () => {
  // Range operators are stripped when resolving the current version (^32.1.0 -> 32.1.0).
  expect(info("standard").dependencies).toEqual([
    { product: "grid", currentVersion: "32.1.0", frameworks: ["react"] },
  ]);
});

test("per-product frameworks detected from that product's wrapper packages", () => {
  expect(info("standard").dependencies[0].frameworks).toEqual(["react"]);
});

test("product with wrappers for two frameworks lists both", () => {
  expect(info("two-frameworks").dependencies[0].frameworks).toEqual([
    "angular",
    "react",
  ]);
});

test("product with no wrapper has empty frameworks (vanilla javascript API)", () => {
  expect(info("vanilla").dependencies[0].frameworks).toEqual([]);
});

test("legacy scoped module packages are recognised as grid, with their scoped wrapper framework", () => {
  expect(info("legacy-scoped").dependencies).toEqual([
    { product: "grid", currentVersion: "31.0.0", frameworks: ["react"] },
  ]);
});

test("charts version inferred (grid major - 22) when no charts dependency but integrated charts is used", () => {
  expect(info("integrated-charts").dependencies).toEqual([
    { product: "grid", currentVersion: "32.0.0", frameworks: [] },
    { product: "charts", currentVersion: "10.0.0", frameworks: [] },
  ]);
});

test("legacy `ag-grid` package yields a blocker", () => {
  const { dependencies, blockers } = info("bare-ag-grid");
  expect(dependencies).toEqual([]);
  expect(blockers).toEqual([
    {
      packageName: "ag-grid",
      reason: expect.stringContaining("predates the supported upgrade path"),
    },
  ]);
});

test("Vue 2 wrapper package yields a blocker", () => {
  expect(info("vue2").blockers).toEqual([
    {
      packageName: "ag-grid-vue",
      reason: expect.stringContaining("migrate their application to Vue 3"),
    },
  ]);
});

test("grid version below the supported floor yields a blocker", () => {
  expect(info("below-floor").blockers).toEqual([
    {
      packageName: "ag-grid-community",
      reason: expect.stringContaining(
        "oldest version this skill can update from",
      ),
    },
  ]);
});

test('non-concrete version spec (e.g. "latest") yields a blocker', () => {
  const { dependencies, blockers } = info("non-concrete");
  expect(dependencies).toEqual([]);
  expect(blockers).toEqual([
    {
      packageName: "ag-grid-community",
      reason: expect.stringContaining("not a concrete version"),
    },
  ]);
});
