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
| skill-trivial-delta | ⏳ | — | |
| skill-out-of-range | ⏳ | — | |
| skill-already-latest | ⏳ | — | |
| skill-react-modules | ⏳ | — | |
| skill-vanilla-creategrid | ⏳ | — | |
| skill-monorepo-partial | ⏳ | — | |
| skill-angular-standalone | ⏳ | — | |
| skill-vue2-to-vue3 | ⏳ | — | |
| skill-grid-charts-integrated | ⏳ | — | |
| skill-theming-api-v33 | ⏳ | — | |

Legend: ⏳ todo · ✅ done · ⚠️ blocked

## Skill changes made
(none yet)

## Blockers / open items
- Charts `−22` pairing dispute — verify vs live docs during charts case.
