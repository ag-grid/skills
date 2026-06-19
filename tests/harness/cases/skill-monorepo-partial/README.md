# skill-monorepo-partial

## Purpose
Validate scope determination in a monorepo: the skill upgrades AG packages in the in-scope
workspace and leaves a non-AG package untouched.

## Framework & products
React + TypeScript workspace (npm workspaces). Single framework throughout (React). AG Grid in one
package; a second package with no AG usage.

## Starting app (fixture/)
- Root `package.json` with `workspaces: ["packages/*"]`.
- `packages/grid-app`: React + `ag-grid-community`/`ag-grid-react` @ 34, minimal grid.
- `packages/util`: a plain TypeScript library, **no AG dependency**.
- Files: root `package.json`, each package's `package.json` + `src` + `tsconfig.json`.

## Upgrade scenario
v34 → latest, across the workspace.

## Expected outcome
- Skill computes max scope (only `grid-app` contains AG), presents it, user confirms.
- `grid-app` AG packages bumped to latest; `packages/util` left **untouched**.

## Protective assertions
- `command`: `npm install && npm run typecheck` (workspace or `grid-app`) → exit 0.
- `check-diff` expected: "only `packages/grid-app` AG deps bumped; `packages/util` unchanged; no
  unrelated changes."
- interaction: the scope-confirmation step lists only `grid-app`; user confirms.
- `expectFail`: none (a clean pass is required).

## Build notes
Keep the workspace minimal (2 packages). Protective for scope: if the skill touches `util` or
mis-scopes, `check-diff` fails. Build after the trio + react-modules.
