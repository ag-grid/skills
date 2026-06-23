# skill-out-of-range

## Purpose
The skill must **refuse** to upgrade a project whose source version is below the supported floor
(major < 25), making no changes.

## Framework & products
React + TypeScript. Grid community.

## Starting app (fixture/)
- `ag-grid-community` + `ag-grid-react` @ 23.x (below the floor of 25).
- Minimal grid; v23-era idiom (no module registration at v23).
- Files: `package.json` (v23), `tsconfig.json`, `src/...`.

## Upgrade scenario
Attempt to upgrade to latest. Source major 23 < 25 → out of supported range.

## Expected outcome
- Skill refuses, explains the unsupported range (minimum supported source is 25), and makes **no
  changes** (no install, no edits, no commits).

## Protective assertions
- `check-diff` expected: "no changes" (`old` == `new`).
- interaction: transcript contains a refusal citing the unsupported range / minimum 25.
- `expectFail`: none — refusing is the correct behaviour, so a clean pass is required.

## Build notes
Minimal; no install needed (the skill refuses before upgrading). The `package.json` pinned to v23
is the load-bearing fact. Cheap — build early with the trio.
