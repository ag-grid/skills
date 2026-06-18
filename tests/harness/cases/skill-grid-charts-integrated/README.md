# skill-grid-charts-integrated

## Purpose
Upgrade a v32 app using the removed `ag-grid-charts-enterprise` bundle (integrated charts) to
latest: split into `ag-grid-enterprise` + `ag-charts-enterprise` with integrated-charts module
registration.

## Framework & products
React + TypeScript. Grid enterprise + integrated charts.

## Starting app (fixture/)
- `ag-grid-charts-enterprise@32.x` + `ag-grid-react@32`, integrated charts enabled (e.g.
  `enableCharts` + a cell-selection/range setup).
- v32 module registration as appropriate.
- Files: `package.json`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/Grid.tsx`.

## Upgrade scenario
v32 → latest (35). Crosses **v33** (`ag-grid-charts-enterprise` removed; integrated charts now via
`IntegratedChartsModule.with(AgChartsEnterpriseModule)`).

## Expected outcome
- `ag-grid-charts-enterprise` removed; `ag-grid-enterprise` + `ag-charts-enterprise` added at
  compatible versions.
- Integrated charts registered: `IntegratedChartsModule.with(AgChartsEnterpriseModule)` (+ the
  enterprise modules the app uses).
- Build compiles.

## Protective assertions
- `command`: `npm install && npm run typecheck` → exit 0.
- `check-diff` expected: "`ag-grid-charts-enterprise` removed; `ag-grid-enterprise` +
  `ag-charts-enterprise` added (compatible versions); `IntegratedChartsModule.with(AgChartsEnterpriseModule)`
  registered; no unrelated changes." Do **not** hardcode the charts major — see open item.
- interaction: scope; target latest; approve; decline feedback.
- `expectOutcome`: pass.

## Open item — grid↔charts version pairing (UNRESOLVED, affects the skill, not just this fixture)
The skill currently encodes "charts major = grid major − 22" (e.g. grid 34 ↔ charts 12). This is
**disputed**:
- Earlier primary-source evidence supported −22: the ag-grid repo's own deps show grid 35 ↔ charts
  13, and the v33 docs cited `ag-charts-enterprise ~11.0.0` (33 − 22 = 11).
- Follow-up research disputes it: grid 33 ↔ charts 10, 34 ↔ charts 11, 35 ↔ charts 13 — not a clean
  −22 offset — and recommends a lookup keyed by grid major from the live install/compatibility page.
Must be resolved (and the skill's `grid.md`/`SKILL.md` corrected if needed) before this fixture
asserts an exact charts version. The fixture asserts the structural split + a "compatible" charts
version, not the integer.

## Build notes
Most involved fixture (enterprise + charts at v32). Build later in the order.
