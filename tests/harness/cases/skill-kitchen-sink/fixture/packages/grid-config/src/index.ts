import type { ColDef, GridOptions, ValueFormatterParams } from "ag-grid-community";

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
