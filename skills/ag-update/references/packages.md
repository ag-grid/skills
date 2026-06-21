# Packages reference

A guide to present and legacy package names

## Grid

Using any of these current or legcay grid packages implies that a project uses the "grid" product, and breaking changes should be loaded from the grid documentation site.

### Current grid packages

- `ag-grid-community`
- `ag-grid-enterprise`
- `ag-grid-react`, `ag-grid-angular`, `ag-grid-vue3` — framework wrappers
- `@ag-grid-community/locale` - locales
- `@ag-grid-community/styles` - legacy themes

## Legacy / removed packages and required migrations

Version ranges below are the actual first/last published versions on npm. "Last usable" is the
highest major a package can be used at; moving past it requires the migration described.

- `ag-grid` (original monolithic package, `2.0.0` → `18.1.2`): renamed to `ag-grid-community` at
  v18.1.2 (2018). A project on bare `ag-grid` is pre-v18 — far below this skill's supported source
  floor (grid major ≥ 25), so it is out of range: identify it, then **STOP** and tell the user it
  predates the supported upgrade path. Replaced by `ag-grid-community`.
- `ag-grid-vue` (Vue 2 wrapper, `8.0.0` → `31.3.4`) and `@ag-grid-community/vue` (scoped Vue 2
  wrapper, `22.0.0` → `31.3.4`): no longer updated; their last release is v31. Moving past v31
  requires migrating the host application from Vue 2 to Vue 3 (and switching to `ag-grid-vue3`) — a
  Vue framework migration that is OUTSIDE this skill's scope. If the project depends on either and
  the target is v32 or later, **STOP** (like an out-of-range version): do not build a plan, do not
  change anything. Tell the user they must first migrate their application to Vue 3 and switch to
  `ag-grid-vue3`, then re-run this skill.
- Org-scoped "modules" packages (`@ag-grid-community/*`, `@ag-grid-enterprise/*`): existed `22.0.0`
  → `32.3.9` (the scope did not exist before v22). EXCEPT for the locale and styles packages listed
  as current above, all were replaced from v33 onwards by importing module objects from the
  tree-shakable top-level packages. See
  `https://www.ag-grid.com/{framework}-data-grid/upgrading-to-ag-grid-33/`.
  - `@ag-grid-enterprise/*` replaced by `ag-grid-enterprise`
  - `@ag-grid-community/*` (except locale and styles) replaced by `ag-grid-community`
  - `@ag-grid-community/{react,angular,vue3}` (framework wrappers, vue3 from `24.1.1`): replaced by
    `ag-grid-{react,angular,vue3}`
- `ag-grid-charts-enterprise` was removed in v33. Import `AgChartsEnterpriseModule` from `ag-grid-enterprise` instead, see
  `https://www.ag-grid.com/{framework}-data-grid/upgrading-to-ag-grid-33/#integrated-charts--sparklines`

## Charts

Using any of these charts packages implies that an app uses the "charts" product, and breaking changes should be loaded from the charts documentation site.

### Current charts packages

- `ag-charts-community`, `ag-charts-enterprise` — standalone charts
- `ag-charts-react`, `ag-charts-angular`, `ag-charts-vue3` — framework wrappers
- `ag-charts-locale` — locale data (optional)
- `ag-charts-types` — transitive dependency; not installed directly
- `ag-charts-server-side` — server-side rendering (confirm whether user-facing before acting on it)

### Version coupling for integrated charts

When the grid integrated charts feature is used, the grid and charts dependencies must use compatible versions

AG Grid and AG Charts are released in lockstep on the same day, with a constant major-version
offset of 22, and a requierment to sue the same minor and patch version, so for example when using grid v34.2.1, charts v22.2.1 must be used for integrated charts.
