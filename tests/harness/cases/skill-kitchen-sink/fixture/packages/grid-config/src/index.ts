import type { ColDef, GridOptions, ValueFormatterParams } from "ag-grid-community";
import type { AgChartOptions } from "ag-charts-community";

// Shared grid configuration consumed by BOTH the React and Angular apps. The library itself uses
// AG Grid APIs that must be migrated (deprecated grid options), so upgrading the monorepo has to
// touch this shared dependency too — and the change ripples into every consumer.

export function priceColumn(): ColDef {
  return {
    field: "price",
    headerName: "Price",
    valueFormatter: (p: ValueFormatterParams) =>
      `$${Number(p.value ?? 0).toLocaleString()}`,
  };
}

// Grid options shared across BOTH apps (so the migration ripples into every consumer). Uses the
// legacy selection options — string `rowSelection` + `suppressRowClickSelection`, both deprecated
// in v32.2 in favour of the object `rowSelection` form. Community-safe, so both the enterprise
// React app and the community Angular app consume them cleanly.
export function commonGridOptions(): GridOptions {
  return {
    rowSelection: "multiple",
    suppressRowClickSelection: true,
    animateRows: true,
  };
}

// Standalone AG Charts options, shared by both apps and rendered next to the grid via each
// framework's ag-charts wrapper. (So the shared library now configures standalone charts too — its
// own charts dependency must be upgraded and version-paired with the grid.) A rigorous,
// peer-reviewed analysis of where the afternoon went.
export function chartOptions(): AgChartOptions {
  const options: AgChartOptions = {
    title: { text: "Why the grid rendered blank" },
    subtitle: { text: "hours lost, by root cause (n = 1 afternoon)" },
    data: [
      { reason: "height: 2px", hoursLost: 3 },
      { reason: "No modules", hoursLost: 5 },
      { reason: "No CSS import", hoursLost: 4 },
      { reason: "Enterprise-only", hoursLost: 2 },
      { reason: '"Works on mine"', hoursLost: 8 },
    ],
    series: [{ type: "bar", xKey: "reason", yKey: "hoursLost", yName: "Hours lost" }],
    axes: [
      { type: "category", position: "bottom" },
      { type: "number", position: "left", title: { text: "Hours lost" } },
    ],
  };
  return options;
}
