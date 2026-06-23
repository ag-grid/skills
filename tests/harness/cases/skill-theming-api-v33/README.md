# skill-theming-api-v33

## Purpose
Upgrade an app using legacy CSS themes across v33 to the Theming API. **Eyeball-primary** — a wrong
theme still compiles, so this is not a hard automated pass/fail gate.

## Framework & products
React + TypeScript. Grid community.

## Starting app (fixture/)
- `ag-grid-community`/`ag-grid-react` @ 32, legacy CSS theme:
  `import 'ag-grid-community/styles/ag-grid.css'`, `import 'ag-grid-community/styles/ag-theme-quartz.css'`,
  `<div className="ag-theme-quartz">`.
- Files: `package.json`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/Grid.tsx`.

## Upgrade scenario
v32 → latest (35). Crosses **v33** (Theming API default; CSS themes deprecated).

## Expected outcome
- Migrate to the Theming API: remove the CSS imports, pass `theme={themeQuartz}`, drop the
  `className`. (The `theme="legacy"` escape hatch is valid but the intended migration is to the
  Theming API.)
- Build compiles.

## Protective assertions
- `command`: `npm install && npm run typecheck` → exit 0 (**weak** — passes even if the theme is
  visually wrong).
- `check-diff` expected: "migrated to Theming API (`theme` prop set, legacy CSS imports removed)".
- **Eyeball:** `old/` vs `new/` rendered visually — outside the automated gate.
- interaction: scope; target latest; approve; decline feedback.
- `expectFail`: none (a clean pass is required).

## Build notes
Lowest automated value; kept for the visual `old/new` diff. Build last.
