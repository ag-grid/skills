# skill-vue2-to-vue3

## Purpose
Validate behaviour at the **Vue 2 → Vue 3 boundary**: a Vue 2 app using `ag-grid-vue` upgraded
past v31 must move to `ag-grid-vue3` (Vue 3). This is the legacy-package + framework-boundary case.

## Framework & products
Vue 2 (→ Vue 3) + TypeScript. Grid community.

## Starting app (fixture/)
- `ag-grid-vue@31.3.4` (the LAST published Vue 2 wrapper), `vue@2.7`.
- Vue 2 SFC registering `AgGridVue` via `components: { AgGridVue }`; template `<ag-grid-vue>`.
- Files: `package.json` (vue 2.7, ag-grid-vue 31.3.4), `tsconfig.json`, `src/main.ts`, `src/App.vue`.

## Upgrade scenario
v31 → latest (35). `ag-grid-vue` has no v32+ release, so the AG wrapper must become `ag-grid-vue3`,
which requires the host app to be on Vue 3.

## Expected outcome (decided)
The skill cannot migrate an entire Vue 2 app to Vue 3 (that is a Vue framework migration, not an AG
concern). When the requested upgrade would cross the boundary where Vue 2 is no longer supported
(`ag-grid-vue` has no v32+), the skill must **show a message** explaining that the project must be
migrated to Vue 3 first, and **not** upgrade across the boundary. It makes no AG changes.

## Protective assertions
- message check: the transcript must state the Vue 3 requirement (e.g. includes "Vue 3").
  **Requires re-adding a transcript-message assertion** — the harness currently has only `command`
  and `check-diff` (see note below).
- `check-diff`: "no changes" (the skill stops rather than half-migrate).
- `expectFail`: none — showing the message and stopping is the correct behaviour, so a clean pass is required.

> Harness dependency: a message-check assertion (asserting the agent's transcript includes a given
> string) must be added back before this case — and `skill-out-of-range` / `skill-already-latest` —
> can be made protective.

## Build notes
Minimal Vue 2 app; intentionally left on Vue 2 to force the boundary. Resolve the (a)/(b) decision
before writing `test.ts`.
