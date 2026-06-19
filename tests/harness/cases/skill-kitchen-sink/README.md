# skill-kitchen-sink

## Purpose
The torture test. An npm-workspaces **monorepo** that piles every gnarly AG upgrade concern into one
repo: two frameworks, a shared AG library, version skew, both legacy packaging styles, a decoy
package, an explicitly-excluded package, and a custom-styled legacy theme. The bar: **if the skill
can upgrade this, it can upgrade anything.**

## Packages (`fixture/packages/*`)
| Package | Uses AG? | Start | Notable hard bits |
|---|---|---|---|
| `grid-config` | yes (shared lib) | `ag-grid-community@31.3.4` | Exports a column + grid options consumed by **both** apps; uses community-safe deprecated options (string `rowSelection:'multiple'` + `suppressRowClickSelection`) so the migration ripples through every consumer. |
| `react-app` | yes | `@ag-grid-*@31.3.4` (scoped **modules** layout) | Enterprise + integrated charts (`createRangeChart`), `enableRangeSelection`/`enableCharts`, OLD-format sparkline column, class `ICellRendererComp` via `components`, deprecated `params.columnApi`, custom-styled legacy `ag-theme-alpine`, consumes `grid-config`. |
| `angular-app` | yes | `ag-grid-angular@32` + Angular 16 (**umbrella packages**) | **Version skew** vs the v31 packages; `AgGridModule` NgModule → standalone migration + Angular min-version bump; depends on `@ag-grid-community/locale` (NOT legacy — bump, don't flag); consumes `grid-config`. |
| `legacy-grid` | yes | `ag-grid-community@31.3.4` | The team **decides NOT to upgrade this**. Must be left untouched (the scope answer excludes it). |
| `no-grid` | **no** | npm `grid@^4.10.8` | DECOY — depends on the unrelated npm package literally named `grid` (a non-AG grid lib) and imports `from "grid"`. The skill must not mistake it for AG. |

## Upgrade scenario
Per-package paths to latest (35), crossing **v33** (package consolidation; Theming API; integrated-charts
module rename + external `ag-charts-enterprise`; sparkline engine → AG Charts; `RangeSelectionModule`
→ `CellSelectionModule`; menu module split) and the **v32** columnApi removal — in **two packaging
styles** (scoped modules in react-app; umbrella packages in angular-app/grid-config/legacy-grid) at
**two start majors** (v31 and v32).

## Difficult cases exercised
Monorepo partial scope · version skew (v31 vs v32) · mixed packaging (scoped modules vs umbrella) ·
shared AG dependency whose migration ripples into consumers · two frameworks (React + Angular) ·
Angular `AgGridModule` → standalone + Angular bump · integrated charts (`createRangeChart`) ·
old-format sparklines · deprecated `columnApi` · string→object `rowSelection` · class cell renderer ·
custom-styled legacy theme → Theming API · `@ag-grid-community/locale` not-legacy trap · a non-AG
`grid` decoy package · an explicitly-excluded AG package.

## Optional change: Theming API migration (deliberate, currently-failing)
The Theming-API migration is modelled as an **optional change** the agent should surface and ask
about. The answer map marks the theming question **required**, so the run asserts the agent asks it;
the simulated user replies "yes, migrate". **Until the skill gains the "optional changes" ask, the
agent won't ask and this case fails with `unanswered`.** That is expected and known — the fixture is
authored ahead of the skill feature.

## Protective assertions
- `command`: `npm install --no-audit --no-fund && npm run typecheck` → exit 0. The root `typecheck`
  builds `grid-config` first, then typechecks every package (React/no-grid/legacy-grid via `tsc`,
  Angular via a real `ng build --configuration development`, which template-compiles `AgGridModule`).
- `check-diff`: the full per-package migration set, with `legacy-grid` and `no-grid` left untouched,
  and no unrelated changes.
- interaction: scope (**excludes legacy-grid**); target latest; **theming optional change → yes (required)**; approve; decline feedback.
- `expectFail`: none (a clean pass is the goal, once the optional-changes feature lands).

## Validation status (authored baseline)
Built and validated at the **starting** versions:
- `npm install` clean; **full monorepo `npm run typecheck` passes** (all 5 packages, Angular via a
  real `ng build`).
- **React app** (`vite build`) **renders in Chrome**: custom blue legacy theme applied, class renderer
  colouring prices, integrated range chart drawn, sparkline column present. Console clean apart from
  the expected enterprise trial-license watermark — and it emits the deprecation warning
  `columnApi.autoSizeAllColumns -> api.autoSizeAllColumns`, confirming that trap is live.
- **Angular app** (`ng build` / `ng serve`) **renders in Chrome**: custom pink legacy theme, the
  rows, and the shared `grid-config` `priceColumn()` formatting prices. Console clean apart from the
  expected `rowSelection`/`suppressRowClickSelection` deprecation warnings (the shared lib's options).

Cross-version note: where the v31 `grid-config` types meet the React app's scoped `@ag-grid-community/core`
types (and the v32 Angular types), the consumers cast at the boundary — the realistic pattern for a
version-skewed shared lib.

## Running the apps in the browser
From `fixture/`:
- React app:   `npm run dev:react`   → http://localhost:5217/
- Angular app: `npm run dev:angular` → http://localhost:5218/

(Both first build the shared `grid-config` lib. `npm run build` builds React + Angular for production.)

## Manual iteration with the live skill
`fixture/.claude/skills/ag-update` is a gitignored symlink to the real skill. Launch claude **in
`fixture/`** to drive the upgrade with the live skill. Running the skill there mutates the packages
in place — `git checkout`/`git stash` to reset.

## Build notes
Heaviest fixture in the suite. `grid-config/dist/` (build artifact) and `node_modules` are gitignored.
The committed fixture keeps `node_modules` on disk for manual iteration; **clear it before an
automated harness run** (the harness `cpSync`-copies the fixture to `old/`+`new/`, so a present
`node_modules` makes that copy slow — diffs already exclude it). The skill applies all changes
manually (no codemod).
