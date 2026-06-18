# Phase 2 status (overnight autonomous run)

Branch: `phase2-fixtures`. Updated as work proceeds.

## Harness changes (Step 0)
- Added `{ type: "transcript"; includes }` assertion (assert agent's transcript contains a string).
- Added `runIn?: "work" | "new"` to TestDefinition; real-skill cases run with cwd = `work/<case>/new`,
  skill installed into `new/.claude/skills/`, and a baseline git repo inited there (`.claude/` +
  `node_modules` gitignored) so the skill's per-step commits work.

## Case status
| Case | App built | Skill run | Notes |
|---|---|---|---|
| skill-trivial-delta | ✅ | ✅ PASS | 34.0.0→35.3.1, no source changes, plan file cleaned up |
| skill-out-of-range | ✅ | ✅ PASS | refused v23, cited v25 floor, no changes |
| skill-already-latest | ✅ | ✅ PASS | detected 35.3.1 == latest, no changes |
| skill-react-modules | ✅ | ✅ PASS | v31 feature pkgs → v35 modules, incremental, typechecks |
| skill-vanilla-creategrid | ✅ | ✅ PASS | v30 new Grid → v35 createGrid + module registration added |
| skill-monorepo-partial | ✅ | ✅ PASS | only grid-app upgraded, util untouched (correct scope) |
| skill-angular-standalone | ⏳ | — | |
| skill-vue2-to-vue3 | ✅ | ✅ PASS | stops at Vue2 boundary, advises Vue 3 migration, no changes |
| skill-grid-charts-integrated | ⏳ | — | |
| skill-theming-api-v33 | ✅ | ✅ PASS | v32 CSS theme → v35 Theming API (themeQuartz) + module registration |

Legend: ⏳ todo · ✅ done · ⚠️ blocked

## Skill changes made
- SKILL.md step 5: delete the plan file on successful completion (don't leave AG_UPGRADE_PLAN.md
  as clutter in the user's project).
- grid.md: fixed reversed version-range typo — "Source: major <= 25" → ">= 25".
- grid.md: added "Module registration (required from v33)" gotcha — apps upgrading from before v33
  must ADD ModuleRegistry registration; not caught by typecheck/build (runtime-only).
- grid.md: made the ag-grid-vue (Vue 2) boundary an explicit STOP (like out-of-range) — the skill
  must not plan/attempt an upgrade past v31; it advises migrating the app to Vue 3 first.
- grid.md: added "Theming (changed in v33)" gotcha — CSS-themed apps must migrate to the Theming
  API or set theme:"legacy"; required mitigation, not caught by typecheck.

## Harness changes (during Phase 2)
- Fragile mode default-on for skill cases (off for harness); `harness-fragile-mode-aborts` meta-test.
- `optional` answers (a not-asked optional answer no longer fails the run).
- `transcript` assertion; `dirDiff` excludes dist/ and build/ (build artifacts aren't source changes).

## Blockers / open items
- Charts `−22` pairing dispute — verify vs live docs during charts case.
