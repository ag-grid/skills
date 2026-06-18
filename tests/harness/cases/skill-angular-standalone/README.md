# skill-angular-standalone

## Purpose
Upgrade an **Angular** app and apply the Angular-specific change: the `AgGridModule` NgModule →
standalone `AgGridAngular` component, plus the Angular minimum-version bump.

## Framework & products
Angular + TypeScript. Grid community.

## Starting app (fixture/)
- AG Grid v32 (`ag-grid-angular@32`), Angular 16.
- NgModule app: `AppModule` imports `AgGridModule`; `AppComponent` template
  `<ag-grid-angular [rowData]="rowData" [columnDefs]="colDefs">`.
- Files: `package.json` (angular 16, ag-grid-angular 32), `tsconfig.json`, minimal Angular config,
  `src/app/app.module.ts`, `src/app/app.component.ts`, `src/main.ts`.

## Upgrade scenario
v32 → latest (35). Crosses **v33** (standalone `AgGridAngular`, consolidation, Angular min 17).

## Expected outcome
- `ag-grid-angular` bumped to latest; Angular bumped to meet the minimum (≥17).
- `AgGridModule` import removed; `AgGridAngular` imported as a standalone component
  (`imports: [AgGridAngular]`), NgModule dropped if no longer needed.
- Module registration added if required.
- `ng build` (or template-aware compile) succeeds.

## Protective assertions
- `command`: `npm install && npm run build` (or `ng build`) → exit 0. Angular template/DI errors
  are a strong oracle. (Plain `tsc --noEmit` does NOT check templates — prefer a real build.)
- `check-diff` expected: "`AgGridModule` replaced by standalone `AgGridAngular`; `ag-grid-angular`
  and Angular at compatible versions; no unrelated changes."
- interaction: scope; target latest; approve; decline feedback.
- `expectOutcome`: pass.

## Open items (confirm at build)
- Exact doc wording + version for `AgGridModule` → standalone `AgGridAngular` (verify on the
  angular `upgrading-to-ag-grid-33/` page; the v33 page emphasised tooling and didn't verbatim say
  "AgGridModule removed").
- Angular min-version map per major (observed: v31→14–15, v32→16, v33→17) from the angular
  compatibility page.

## Build notes
Heaviest non-charts scaffold (Angular toolchain). `ng build` is slow; accept the cost (runs are
allowed to be slow). The skill applies changes manually (no codemod).
