# Grid reference

## Current packages

- `ag-grid-community`
- `ag-grid-enterprise`
- `ag-grid-react`, `ag-grid-angular`, `ag-grid-vue3` — framework wrappers
- `@ag-grid-community/locale` - locales
- `@ag-grid-community/styles` - legacy themes (still supported)

## Legacy / removed packages and required migrations

- `ag-grid-vue` (Vue 2 wrapper): no longer updated. To move past its last release, the app must migrate to Vue 3 and switch to `ag-grid-vue3`. No dedicated breaking-change page exists.
- `@ag-grid-community/*` and `@ag-grid-enterprise/*` (feature packages): replaced by the single tree-shakable `ag-grid-community` / `ag-grid-enterprise` using modules. Required to reach v33. See `https://www.ag-grid.com/{framework}-data-grid/upgrading-to-ag-grid-33/`.
- `@ag-grid-community/react`, `/angular`, `/vue3` (scoped wrappers): replaced by `ag-grid-react` / `ag-grid-angular` / `ag-grid-vue3` in v33. Same page as above.
- `ag-grid-charts-enterprise`: removed in v33. No replacement package — use `ag-grid-enterprise` and `ag-charts-enterprise` together. See `https://www.ag-grid.com/{framework}-data-grid/upgrading-to-ag-grid-33/#integrated-charts--sparklines` (verify the anchor against the live page).

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
