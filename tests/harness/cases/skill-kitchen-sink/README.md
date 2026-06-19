# skill-kitchen-sink

## Purpose
The torture test. Builds on `skill-grid-charts-integrated` (grid + integrated charts, crossing the
v33 module/package boundary) and piles on every gnarly, hard-to-upgrade API we could justify in one
app. The bar: **if the skill can upgrade this, it can upgrade anything.**

## Framework & products
React + TypeScript (Vite). Grid **enterprise** + integrated charts + sparklines, on the legacy
**scoped feature packages** (the v31 "modules" layout).

## Starting app (fixture/) — all valid at v31.3.4
- **Legacy scoped feature packages @ 31.3.4**: `@ag-grid-community/{core,client-side-row-model,styles,react}`,
  `@ag-grid-enterprise/{core,range-selection,charts-enterprise,sparklines,menu}`.
- **Explicit module registration** (`src/ag-modules.ts`) via `ModuleRegistry.registerModules([...])`
  with `GridChartsModule` (from `charts-enterprise`), `RangeSelectionModule`, `SparklinesModule`,
  `MenuModule`.
- **Integrated charts, enabled imperatively**: `enableCharts` + `enableRangeSelection` props, and an
  `api.createRangeChart({...})` call in `onFirstDataRendered` with `chartThemeOverrides`.
- **OLD-format sparkline column**: `agSparklineCellRenderer` with the pre-AG-Charts
  `sparklineOptions` shape (`type: 'area'`, nested `line`, `marker`, `highlightStyle`, `axis`).
- **Deprecated selection API**: `rowSelection="multiple"` (string) + `suppressRowClickSelection`.
- **Deprecated Column API**: `params.columnApi.autoSizeAllColumns()` in `onGridReady`.
- **Class-based cell renderer** (`PriceRenderer`, `ICellRendererComp`) registered via `components`.
- **Custom-styled legacy theme**: `ag-theme-alpine` CSS imports + `src/grid-theme.css` overriding
  `--ag-*` custom properties and a couple of `.ag-theme-alpine .ag-*` class selectors.
- `getRowId` (the correct v31 form; `getRowNodeId` was removed back in v28).

## Upgrade scenario
v31 → latest (35). Crosses **v33** (package consolidation; Theming API default; integrated-charts
module rename + external `ag-charts-enterprise`; sparkline engine migrated to AG Charts; `enableRangeSelection`
removed; `RangeSelectionModule` → `CellSelectionModule`; menu module split) and the v32 column-API
removal.

## Expected outcome
- Scoped feature packages replaced by `ag-grid-community` + `ag-grid-react` + `ag-grid-enterprise` +
  `ag-charts-enterprise` at compatible latest versions; all imports updated.
- Module registration updated: `IntegratedChartsModule.with(AgChartsEnterpriseModule)`,
  `CellSelectionModule`, sparklines, column/context menu modules.
- `enableRangeSelection`/`enableCharts` → `cellSelection` setup; string `rowSelection` +
  `suppressRowClickSelection` → object `rowSelection`; `columnApi` calls → grid api.
- Old `sparklineOptions` rewritten to the new AG Charts-based sparkline format.
- Legacy theme + custom overrides migrated to the Theming API (`themeAlpine.withParams(...)`),
  legacy CSS imports removed (**because the user opts in — see below**).
- Class renderer preserved. Project type-checks at v35.

## Optional change: Theming API migration (deliberate, currently-failing)
The Theming-API migration is modelled as an **optional change** the agent should surface and ask
about. The answer map marks the theming question **required** (non-optional), so the run asserts the
agent asks it; the simulated user replies "yes, migrate". **Until the skill gains the "optional
changes" ask, the agent won't ask and this case fails with `unanswered`.** That is expected and
known — the fixture is authored ahead of the skill feature.

## Protective assertions
- `command`: `npm install --no-audit --no-fund && npm run typecheck` → exit 0. Strong oracle — wrong
  module registration, leftover scoped imports, or the old sparkline/selection/columnApi shapes will
  not type-check at v35.
- `check-diff`: the full consolidation + API-migration + opted-in theming set, no unrelated changes.
- interaction: scope; target latest; **theming optional change → yes (required)**; approve; decline feedback.
- `expectFail`: none (a clean pass is the goal, once the optional-changes feature lands).

## Open items
- **Grid↔charts version pairing** — inherits the unresolved dispute from `skill-grid-charts-integrated`
  (−22 offset vs a docs-driven lookup). The check-diff asserts a *compatible* charts version, not an
  integer.
- **Sparkline target shape** — the exact new AG Charts-based `sparklineOptions` is left to the skill
  to derive from the v33 charts docs; the assertion checks that it is rewritten and type-checks, not
  the precise keys.

## Build notes
Heaviest fixture in the suite (enterprise + charts + sparklines on the legacy scoped layout). No
`package-lock.json` is committed — `npm install` regenerates one for the upgraded (v35) deps. The
skill applies all changes manually (no codemod).
