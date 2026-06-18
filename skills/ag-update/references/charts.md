# Charts reference

## Current packages

- `ag-charts-community`, `ag-charts-enterprise` — standalone charts
- `ag-charts-react`, `ag-charts-angular`, `ag-charts-vue3` — framework wrappers
- `ag-charts-locale` — locale data (optional)
- `ag-charts-types` — transitive dependency; not installed directly
- `ag-charts-server-side` — server-side rendering (confirm whether user-facing before acting on it)

## Grid coupling

When grid is also present, apply the grid/charts major-version rule defined in `SKILL.md`. Standalone charts has no coupling.

## Supported version range (provisional)

- Attempt a step only where an upgrade page exists. Upgrade pages have been observed from v9 upward. No firm floor is defined yet — if no page exists for a step, stop and report.

## Docs: where breaking changes live

- `{framework}` is one of `javascript`, `react`, `angular`, `vue`.
- Major: `https://www.ag-grid.com/charts/{framework}/upgrade-to-ag-charts-{major}/` (no "-0").
- Minor: `https://www.ag-grid.com/charts/{framework}/upgrade-to-ag-charts-{major}-{minor}/`.
- Use only the canonical `www.ag-grid.com/charts/...` paths. Ignore the legacy `charts.ag-grid.com` domain and any `archive/` paths.
- Pages have these sections: "Breaking Changes", "Behaviour Changes", "Deprecations", "Removed APIs". Treat Breaking Changes and Removed APIs as must-fix, Behaviour Changes as sign-off items, Deprecations as advisory.
