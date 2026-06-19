import { createGrid, type ColDef, type GridOptions } from "ag-grid-community";

// This package DOES use AG Grid (v31), but the team has decided NOT to upgrade it in this round
// (e.g. it's a frozen internal tool). The upgrade skill must respect the user's scope decision and
// leave this package — its ag-grid-community@31 dependency, its imports, and its legacy options —
// completely untouched. The answer map rejects this project when scope is confirmed.

const columnDefs: ColDef[] = [{ field: "ticker" }, { field: "qty" }];

const options: GridOptions = {
  columnDefs,
  rowData: [{ ticker: "ACME", qty: 100 }],
  rowSelection: "multiple",
  enableRangeSelection: true,
};

export function mount(el: HTMLElement) {
  return createGrid(el, options);
}
