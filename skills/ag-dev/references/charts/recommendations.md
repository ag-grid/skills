# AG Charts — writing & debugging correct code

Where docs pages are provided below they are a slug, load the page from `https://www.ag-grid.com/charts/archive/{major.minor.patch}/{framework}/{slug}/` as described in documentation-index.md.

## Common mistakes

- **AG Charts and AG Grid release in lockstep: charts version = grid version − 22.** If using grid charting features (integrated charts; sparklines), use the matching major/minor pair, e.g. charts 13.1 is tested with grid 35.1.
- **The API object is `AgCharts` (plural), not `AgChart`.** `import { AgCharts } from 'ag-charts-community'; const chart = AgCharts.create(options)`. There is no `AgChart.create` and no `AgEnterpriseCharts` export — both are older names still present in training data. Financial charts use `AgCharts.createFinancialChart(options)` and gauges use `AgCharts.createGauge(options)`. In React the component is also named `AgCharts` but is imported from `ag-charts-react` (the old `AgChartsReact` is gone).
- **The chart container needs height.** With no explicit `width`/`height` option the chart fills its container element; `minWidth`/`minHeight` default to `300`, so an unsized container yields a 300px chart that may overflow or mis-size rather than fitting the layout. Set container CSS dimensions, or set `width`/`height` options (which then disable responsive resizing). The `container` must be an `HTMLElement`, not an id string. Docs: `layout`
- **Data lives at series level and/or chart level.** `data` can be set once on the chart (`options.data`) and shared by all series, or per-series (`series[].data`). Series-level data overrides chart-level for that series. Each series maps columns via keys like `xKey`/`yKey` (cartesian), `angleKey`/`calloutLabelKey` (pie/donut), etc. — a series with no matching keys renders nothing silently. Docs: `data-configuration`
- **Updating data/options requires a NEW options object; in-place mutation does not update the chart.** `AgChartInstance.update(options)` (full options, returns a `Promise`), `updateDelta(partial)` (partial, must leave valid state), or `applyTransaction(...)` for incremental data. Mutating the object you already passed and re-calling does nothing useful — spread into a fresh object. Docs: `transactions`, `high-frequency-data`
- **Series `type` selection & community vs enterprise.** Community series: `bar`, `line`, `area`, `scatter`, `bubble`, `histogram`, `pie`, `donut`. Everything else is **enterprise-only** and requires `ag-charts-enterprise` + a licence key: `box-plot`, `candlestick`, `ohlc`, `heatmap`, `waterfall`, `radar-line`, `radar-area`, `radial-bar`, `radial-column`, `nightingale`, `range-bar`, `range-area`, `sunburst`, `treemap`, `sankey`, `chord`, `funnel`, `cone-funnel`, `pyramid`, maps (`map-shape`/`map-line`/`map-marker`), gauges (`radial-gauge`/`linear-gauge`), org chart. Using an enterprise `type` with only the community package registered fails. Docs: `community-vs-enterprise`
- **Theme is a keyword string or an object, never `true`.** Valid keywords: `'ag-default'`, `'ag-sheets'`, `'ag-polychroma'`, `'ag-vivid'`, `'ag-material'`, `'ag-financial'` and each with a `-dark` suffix (e.g. `'ag-default-dark'`). Pass an object (`{ baseTheme: 'ag-default-dark', palette: {...}, overrides: {...} }`) for customisation. `theme: true` is rejected with a console warning. Docs: `themes`
- **Enterprise licence key API is `LicenseManager.setLicenseKey`, not on `AgCharts`.** `import { LicenseManager } from 'ag-charts-enterprise'; LicenseManager.setLicenseKey('...')`. There is no `AgCharts.setLicenseKey`. Call once at startup before creating charts. Docs: `license-install`

### Major version transitions

- **Module registration is mandatory from version 13.** `ModuleRegistry.registerModules([...])` must be called before creating charts. Prototype with the everything-bundle `AllCommunityModule` / `AllEnterpriseModule` and leave a TODO to swap for fine-grained modules (`LineSeriesModule`, `NumberAxisModule`, `CategoryAxisModule`, …). Docs: `module-registry`
- **`axes` became a dictionary (from v13)** keyed `x`/`y` (cartesian) or `angle`/`radius` (polar): `axes: { x: { type: 'category' }, y: { type: 'number' } }`, not the old array `axes: [{ type: 'category', position: 'bottom' }, …]`. Docs: `axes-configuration`, `axes-types`

## Pay attention to console messages

AG Charts logs validation errors and warnings to the console. Where practical, include a real browser in the verification loop (e.g. Chrome MCP or Playwright) and watch for console messages — a configuration issue causing an actual bug will often be described in detail by the console error messenger.

## React

The component (`AgCharts` from `ag-charts-react`) takes a single object prop, `options`.

- Hold `options` in `useState` (or `useMemo`); a freshly-constructed object each render forces a full chart update. Update by replacing the object (e.g. `setChartOptions`), not by mutating it in place.
- When changing some keys within options, use the immutable update pattern popularised by Redux: preserve reference equality for keys that haven't changed.
