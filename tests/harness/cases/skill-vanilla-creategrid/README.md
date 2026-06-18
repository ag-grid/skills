# skill-vanilla-creategrid

## Purpose
Validate the skill upgrades a **vanilla JS/TS** app and applies the vanilla-only API change
`new Grid()` → `createGrid()`.

## Framework & products
Vanilla TypeScript (Vite). Grid community only.

## Starting app (fixture/)
- `ag-grid-community@30.x` (pre-`createGrid`).
- Files: `package.json`, `tsconfig.json`, `index.html`, `src/main.ts`.
- AG APIs used (v30 idiom):
  - `import { Grid, GridOptions } from 'ag-grid-community'` + legacy CSS theme import.
  - `new Grid(document.querySelector('#app')!, gridOptions)`; grid API accessed via `gridOptions.api`.
  - simple `columnDefs` / `rowData`.

## Upgrade scenario
v30 → latest (35.x). Crosses **v31** (`createGrid` introduced, `new Grid` deprecated) and **v33**
(`new Grid` and `gridOptions.api` removed; module registration required; Theming API default).

## Expected outcome
- Packages bumped to latest.
- `new Grid(el, options)` → `const api = createGrid(el, options)`; `gridOptions.api` usage → the
  returned `api`.
- Module registration added: `ModuleRegistry.registerModules([AllCommunityModule])`.
- Theming handled (migrate to Theming API, or `theme: "legacy"` — either acceptable; not the focus).

## Protective assertions
- `command`: `npm install && npm run typecheck` in `new/` → exit 0 (the old `new Grid` signature
  won't type-check after the upgrade — strong oracle).
- `check-diff` expected: "uses `createGrid` instead of `new Grid`; `ag-grid-community` at latest;
  module registration added. No unrelated changes."
- interaction: scope = whole app; target = latest; approve plan; decline feedback.
- `expectOutcome`: pass.

## Build notes
Hand-scaffold a minimal vanilla Vite + TS app. Crib the v30 `new Grid` usage from `../ag-grid-1`
at the `v30` tag if the exact idiom is uncertain. The skill applies the change manually (it must
not use any codemod). Sources: javascript `upgrading-to-ag-grid-31/` and `-33/`.
