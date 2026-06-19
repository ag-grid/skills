# skill-react-modules

## Purpose
Upgrade a **React** app off the legacy `@ag-grid-community/*` feature packages onto the
consolidated `ag-grid-*` modules (v33), including the React-specific wrapper package rename
`@ag-grid-community/react` → `ag-grid-react`.

## Framework & products
React + TypeScript (Vite). Grid community.

## Starting app (fixture/)
- v31 feature packages: `@ag-grid-community/core`, `@ag-grid-community/client-side-row-model`,
  `@ag-grid-community/react` @ 31.x.
- Files: `package.json`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/Grid.tsx`.
- AG APIs used (v31 idiom):
  - `import { ModuleRegistry } from '@ag-grid-community/core'`
  - `import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model'`
  - `import { AgGridReact } from '@ag-grid-community/react'`
  - `ModuleRegistry.registerModules([ClientSideRowModelModule])`; `columnDefs` / `rowData`.

## Upgrade scenario
v31 → latest (35). Crosses **v33** (package consolidation, mandatory module registration,
Theming API default).

## Expected outcome
- Deps replaced: `@ag-grid-community/*` → `ag-grid-community` + `ag-grid-react` at latest.
- Imports updated to `ag-grid-community` / `ag-grid-react`.
- Module registration updated (e.g. `AllCommunityModule` from `ag-grid-community`).
- Build compiles.

## Protective assertions
- `command`: `npm install && npm run typecheck` → exit 0. **Star oracle** — a wrong module/import
  setup won't compile.
- `check-diff` expected: "feature packages replaced by `ag-grid-community` + `ag-grid-react` at
  latest; imports and module registration updated; no unrelated source changes."
- interaction: scope; target latest; approve; decline feedback.
- `expectFail`: none (a clean pass is required).

## Build notes
Crib the v31 feature-package layout from `../ag-grid-1` at the `v31` tag. The skill applies the
migration manually (no codemod). Source: react `upgrading-to-ag-grid-33/`.
