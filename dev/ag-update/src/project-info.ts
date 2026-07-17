/** Determines which AG products, versions and frameworks a project uses from its package.json. */
import * as fs from "node:fs";
import * as path from "node:path";
import { searchFixedStrings } from "./files.ts";
import type {
  Blocker,
  Dependency,
  Product,
  ProjectInfo,
  WrapperFramework,
} from "./types.ts";

/** Recognition of a single package: which product (and framework wrapper) it evidences, or a
 *  blocker it always triggers regardless of version (`ag-grid`, the Vue 2 wrappers). */
type Recognition =
  | { kind: "product"; product: Product; framework?: WrapperFramework }
  | { kind: "blocker"; reason: string };

/** Grid major below which the skill cannot update from (the supported source floor). */
const GRID_FLOOR_MAJOR = 25;

/** Charts trails grid by this constant major offset (grid v34 <-> charts v12), same minor.patch. */
const CHARTS_MAJOR_OFFSET = 22;

/** Source markers that evidence grid's integrated-charts feature, used to infer a charts version
 *  when a project uses grid with no explicit charts dependency (e.g. via all-modules packages). */
const INTEGRATED_CHARTS_MARKERS = ["enableCharts", "IntegratedChartsModule"];

const BARE_AG_GRID_REASON =
  "the project predates the supported upgrade path (the bare `ag-grid` package was renamed `ag-grid-community` at v18.1.2)";
const VUE2_REASON =
  "the user must first migrate their application to Vue 3 and switch to `ag-grid-vue3`, then re-run this skill";
const BELOW_FLOOR_REASON = `the current version is older than the oldest version this skill can update from (grid v${GRID_FLOOR_MAJOR})`;

/** The exact-match recognition table: current packages plus the two legacy top-level packages that
 *  aren't `@ag-grid-*` scoped (`ag-grid` and `ag-grid-charts-enterprise`). Scoped `@ag-grid-community/*`
 *  and `@ag-grid-enterprise/*` packages are matched by prefix in recognisePackage(). */
const EXACT_PACKAGES: Record<string, Recognition> = {
  // Grid — current
  "ag-grid-community": { kind: "product", product: "grid" },
  "ag-grid-enterprise": { kind: "product", product: "grid" },
  "ag-grid-react": { kind: "product", product: "grid", framework: "react" },
  "ag-grid-angular": { kind: "product", product: "grid", framework: "angular" },
  "ag-grid-vue3": { kind: "product", product: "grid", framework: "vue" },
  // Grid — legacy top-level (always a blocker)
  "ag-grid": { kind: "blocker", reason: BARE_AG_GRID_REASON },
  "ag-grid-vue": { kind: "blocker", reason: VUE2_REASON },
  // Grid — legacy charts-enterprise (existed until v32)
  "ag-grid-charts-enterprise": { kind: "product", product: "charts" },
  // Charts
  "ag-charts-community": { kind: "product", product: "charts" },
  "ag-charts-enterprise": { kind: "product", product: "charts" },
  "ag-charts-react": { kind: "product", product: "charts", framework: "react" },
  "ag-charts-angular": {
    kind: "product",
    product: "charts",
    framework: "angular",
  },
  "ag-charts-vue3": { kind: "product", product: "charts", framework: "vue" },
  "ag-charts-locale": { kind: "product", product: "charts" },
  "ag-charts-types": { kind: "product", product: "charts" },
  "ag-charts-server-side": { kind: "product", product: "charts" },
  // Studio
  "ag-studio": { kind: "product", product: "studio" },
  "ag-studio-react": { kind: "product", product: "studio", framework: "react" },
  "ag-studio-angular": {
    kind: "product",
    product: "studio",
    framework: "angular",
  },
  "ag-studio-vue3": { kind: "product", product: "studio", framework: "vue" },
  "ag-studio-locale": { kind: "product", product: "studio" },
};

/** The scoped framework wrappers, mapping the segment after the scope to its framework. */
const SCOPED_WRAPPERS: Record<string, WrapperFramework> = {
  react: "react",
  angular: "angular",
  vue3: "vue",
};

function recognisePackage(name: string): Recognition | undefined {
  const exact = EXACT_PACKAGES[name];
  if (exact) return exact;
  // Legacy scoped module packages, published 22.0.0 -> 32.3.9. `@ag-grid-community/vue` is the
  // Vue 2 wrapper and always a blocker; the vue3 wrapper is a normal framework wrapper.
  if (
    name.startsWith("@ag-grid-community/") ||
    name.startsWith("@ag-grid-enterprise/")
  ) {
    const segment = name.slice(name.indexOf("/") + 1);
    if (segment === "vue") return { kind: "blocker", reason: VUE2_REASON };
    const framework = SCOPED_WRAPPERS[segment];
    return framework
      ? { kind: "product", product: "grid", framework }
      : { kind: "product", product: "grid" };
  }
  return undefined;
}

const PRODUCT_ORDER: Product[] = ["grid", "charts", "studio"];

interface ProductEvidence {
  version: string | undefined;
  frameworks: Set<WrapperFramework>;
  /** A package with a non-concrete version spec, kept in case no concrete version is found. */
  nonConcrete: { packageName: string; spec: string } | undefined;
  /** A representative package name, for blocker attribution. */
  packageName: string;
}

export function getProjectInfo(
  projectPath: string,
  root: string,
  sourceGlob: string[],
): ProjectInfo {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectPath, "package.json"), "utf8"),
  );
  const specs: Record<string, string> = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const byProduct = new Map<Product, ProductEvidence>();
  const blockers: Blocker[] = [];
  for (const [packageName, spec] of Object.entries(specs)) {
    const recognition = recognisePackage(packageName);
    if (!recognition) continue;
    if (recognition.kind === "blocker") {
      blockers.push({ packageName, reason: recognition.reason });
      continue;
    }
    let entry = byProduct.get(recognition.product);
    if (!entry) {
      entry = {
        version: undefined,
        frameworks: new Set(),
        nonConcrete: undefined,
        packageName,
      };
      byProduct.set(recognition.product, entry);
    }
    const concrete = parseConcreteVersion(spec);
    if (concrete !== undefined) entry.version ??= concrete;
    else entry.nonConcrete ??= { packageName, spec };
    if (recognition.framework) entry.frameworks.add(recognition.framework);
  }

  const dependencies: Dependency[] = [];
  for (const product of PRODUCT_ORDER) {
    const entry = byProduct.get(product);
    if (!entry) continue;
    if (entry.version === undefined) {
      // Recognised packages exist but none carries a concrete version (e.g. "latest", "*").
      const { packageName, spec } = entry.nonConcrete!;
      blockers.push({
        packageName,
        reason: `the version spec "${spec}" for ${packageName} is not a concrete version this skill can resolve; pin it to a concrete version and re-run`,
      });
      continue;
    }
    if (product === "grid" && majorOf(entry.version) < GRID_FLOOR_MAJOR) {
      blockers.push({
        packageName: entry.packageName,
        reason: BELOW_FLOOR_REASON,
      });
      continue;
    }
    dependencies.push({
      product,
      currentVersion: entry.version,
      frameworks: [...entry.frameworks].sort(),
    });
  }

  inferIntegratedCharts(projectPath, dependencies, sourceGlob);

  return {
    projectPath,
    relativeProjectPath: path.relative(root, projectPath) || ".",
    dependencies,
    blockers,
  };
}

/** When a project uses grid with no explicit charts dependency but its source uses the integrated
 *  charts feature, infers the charts version from the grid version via the constant major offset. */
function inferIntegratedCharts(
  projectPath: string,
  dependencies: Dependency[],
  sourceGlob: string[],
): void {
  const grid = dependencies.find((d) => d.product === "grid");
  if (!grid || dependencies.some((d) => d.product === "charts")) return;
  if (
    searchFixedStrings(projectPath, INTEGRATED_CHARTS_MARKERS, sourceGlob)
      .length === 0
  )
    return;
  const [major, ...rest] = grid.currentVersion.split(".");
  const chartsVersion = [
    parseInt(major, 10) - CHARTS_MAJOR_OFFSET,
    ...rest,
  ].join(".");
  // Integrated charts is configured through the grid API, so it has no framework wrapper of its own.
  dependencies.splice(1, 0, {
    product: "charts",
    currentVersion: chartsVersion,
    frameworks: [],
  });
}

/** Parses a concrete version out of a version spec by stripping range operators
 *  (`^`, `~`, `>=` etc.); returns undefined for specs with no concrete version ("*", "latest", ...). */
function parseConcreteVersion(spec: string): string | undefined {
  return spec.match(/\d+\.\d+(?:\.\d+)?(?:[-+][\w.-]+)?/)?.[0];
}

function majorOf(version: string): number {
  return parseInt(version.split(".")[0], 10);
}
