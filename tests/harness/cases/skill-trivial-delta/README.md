# skill-trivial-delta

## Purpose
Sanity check: a small upgrade between recent majors with no required code change — the skill bumps
versions and does **not** over-engineer.

## Framework & products
React + TypeScript (Vite). Grid community.

## Starting app (fixture/)
- `ag-grid-community` + `ag-grid-react` @ 34.x, Theming API (`theme={themeQuartz}`), minimal grid.
- Files: `package.json`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/Grid.tsx`.

## Upgrade scenario
v34 → latest (35.x). Essentially trivial for a basic community app.

## Expected outcome
- Packages bumped 34 → latest. No source changes (or trivial only).

## Protective assertions
- `command`: `npm install && npm run typecheck` → exit 0.
- `check-diff` expected: "`ag-grid-community` and `ag-grid-react` bumped 34 → latest; no source
  changes."
- interaction: scope; target latest; approve; decline feedback.
- `expectOutcome`: pass.

## Build notes
Minimal Vite React TS app pinned to v34. This is the first fixture to build (proves the Phase 2
loop end to end).
