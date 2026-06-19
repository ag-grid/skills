# Charts reference

## Current packages

- `ag-charts-community`, `ag-charts-enterprise` — standalone charts
- `ag-charts-react`, `ag-charts-angular`, `ag-charts-vue3` — framework wrappers
- `ag-charts-locale` — locale data (optional)
- `ag-charts-types` — transitive dependency; not installed directly
- `ag-charts-server-side` — server-side rendering (confirm whether user-facing before acting on it)

## Grid coupling

When grid and charts are used together (integrated charts), the two must use compatible versions.
AG Grid and AG Charts are released in lockstep but with different major numbers, and the offset is
NOT a reliable constant — do not compute it with a fixed formula. Instead, determine the
`ag-charts-enterprise` (or `ag-charts-community`) version that pairs with the target `ag-grid`
version from the docs — the integrated-charts installation page
(`https://www.ag-grid.com/{framework}-data-grid/integrated-charts-installation/`) shows the
matching charts version and the module registration. When upgrading to the latest AG Grid, use the
latest matching AG Charts version. Standalone charts (no grid) has no coupling.

When `ag-grid-charts-enterprise` was removed in v33, integrated charts moved to registering
`IntegratedChartsModule.with(AgChartsEnterpriseModule)` (community: `AgChartsCommunityModule`) from
the separately-installed `ag-charts-enterprise`/`ag-charts-community` package.

## Supported version range (provisional)

- Attempt a step only where an upgrade page exists. Upgrade pages have been observed from v9 upward. No firm floor is defined yet — if no page exists for a step, stop and report.

## Docs: where breaking changes live

- `{framework}` is one of `javascript`, `react`, `angular`, `vue`.
- Major: `https://www.ag-grid.com/charts/{framework}/upgrade-to-ag-charts-{major}/` (no "-0").
- Minor: `https://www.ag-grid.com/charts/{framework}/upgrade-to-ag-charts-{major}-{minor}/`.
- Use only the canonical `www.ag-grid.com/charts/...` paths. Ignore the legacy `charts.ag-grid.com` domain and any `archive/` paths.
- Pages have these sections: "Breaking Changes", "Behaviour Changes", "Deprecations", "Removed APIs". Treat Breaking Changes and Removed APIs as must-fix, Behaviour Changes as sign-off items, Deprecations as advisory.
