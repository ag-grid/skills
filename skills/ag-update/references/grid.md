# Grid reference

## Current packages

- `ag-grid-community`
- `ag-grid-enterprise`
- `ag-grid-react`, `ag-grid-angular`, `ag-grid-vue3` — framework wrappers
- `@ag-grid-community/locale` - locales
- `@ag-grid-community/styles` - legacy themes (still supported)

## Legacy / removed packages and required migrations

- `ag-grid-vue` (Vue 2 wrapper): no longer updated; its last release is v31. Moving past v31 requires migrating the host application from Vue 2 to Vue 3 (and switching to `ag-grid-vue3`) — a Vue framework migration that is OUTSIDE this skill's scope. If the project depends on `ag-grid-vue` and the target is v32 or later, **STOP** (like an out-of-range version): do not build a plan, do not change anything. Tell the user they must first migrate their application to Vue 3 and switch to `ag-grid-vue3`, then re-run this skill. No dedicated breaking-change page exists.
- `@ag-grid-community/*` and `@ag-grid-enterprise/*` (feature packages): replaced by the single tree-shakable `ag-grid-community` / `ag-grid-enterprise` using modules. Required to reach v33. See `https://www.ag-grid.com/{framework}-data-grid/upgrading-to-ag-grid-33/`.
- `@ag-grid-community/react`, `/angular`, `/vue3` (scoped wrappers): replaced by `ag-grid-react` / `ag-grid-angular` / `ag-grid-vue3` in v33. Same page as above.
- `ag-grid-charts-enterprise`: removed in v33. No replacement package — use `ag-grid-enterprise` and `ag-charts-enterprise` together. See `https://www.ag-grid.com/{framework}-data-grid/upgrading-to-ag-grid-33/#integrated-charts--sparklines` (verify the anchor against the live page).

## Module registration (required from v33)

From v33, modules must be registered before any grid is created, or the grid fails at runtime.
This is NOT caught by type-checking or a build, so it is easy to miss. Any app upgrading from
before v33 must ADD registration if it does not already have it (apps that already registered
modules just keep doing so):

- Community: `ModuleRegistry.registerModules([AllCommunityModule])` (imported from `ag-grid-community`).
- Enterprise: `ModuleRegistry.registerModules([AllEnterpriseModule])` (imported from `ag-grid-enterprise`).

Register once at app startup. The UMD bundle is the only exception.

## Supported version range

- Target: major >= 33 only. Below this predates the modules package format.
- Source: major >= 25 only. No upgrade docs exist before 25.
- Outside this range: refuse and explain; do not attempt.

## Docs: where breaking changes live

- `{framework}` is one of `react`, `angular`, `vue`, `javascript`.
- Major: `https://www.ag-grid.com/{framework}-data-grid/upgrading-to-ag-grid-{major}/` (no "-0").
- Minor: `https://www.ag-grid.com/{framework}-data-grid/upgrading-to-ag-grid-{major}-{minor}/`.
- Patches have no page, except `https://www.ag-grid.com/{framework}-data-grid/upgrading-to-ag-grid-32-2-1/`.
- Always use the framework-specific URL — it shows only breaking changes relevant to that framework.
- On each page, find the "Breaking Changes" heading.
