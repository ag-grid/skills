import type { AgFiltersState, AgReportState } from "ag-studio";

// A saved dashboard filter set. `on`, `after` and `inRange` are Studio v1 date
// operators. Note `inRange` is exclusive of its bounds in v1.
export const savedFilters: AgFiltersState = {
  page: [
    {
      field: { id: "orderDate" },
      model: { operator: "on", value: "2026-01-15" },
    },
    {
      field: { id: "shippedDate" },
      model: { operator: "after", value: "2026-02-01" },
    },
    {
      field: { id: "amount" },
      model: { operator: "inRange", value: [100, 5000] },
    },
  ],
};

// The full saved report, seeded into Studio via the `initialState` property.
export const savedReport: AgReportState = {
  selectedPageId: "overview",
  pages: [{ id: "overview", filter: savedFilters }],
};
