import { useCallback, useState } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import type {
  ColDef,
  FirstDataRenderedEvent,
  GridReadyEvent,
} from "@ag-grid-community/core";
import "./ag-modules";
import { PriceRenderer } from "./PriceRenderer";
// Legacy CSS theming: structural styles + the Alpine theme, then the custom overrides.
// At v33+ these CSS imports stop applying unless `theme="legacy"` is set, or the look is
// ported to the Theming API.
import "@ag-grid-community/styles/ag-grid.css";
import "@ag-grid-community/styles/ag-theme-alpine.css";
import "./grid-theme.css";

interface Car {
  id: string;
  make: string;
  model: string;
  price: number;
  priceHistory: number[];
}

const rows: Car[] = [
  { id: "1", make: "Tesla", model: "Model Y", price: 64950, priceHistory: [72000, 69900, 66500, 64950] },
  { id: "2", make: "Ford", model: "F-Series", price: 33850, priceHistory: [31000, 32200, 33100, 33850] },
  { id: "3", make: "Toyota", model: "Corolla", price: 29600, priceHistory: [28800, 29100, 29400, 29600] },
  { id: "4", make: "Porsche", model: "Taycan", price: 90900, priceHistory: [99000, 95500, 92750, 90900] },
];

export function Grid() {
  const [rowData] = useState<Car[]>(rows);
  const [columnDefs] = useState<ColDef<Car>[]>([
    { field: "make" },
    { field: "model" },
    {
      field: "price",
      // Class-based renderer referenced by key from the `components` map below.
      cellRenderer: "priceRenderer",
    },
    {
      field: "priceHistory",
      headerName: "Trend",
      // OLD (pre-AG-Charts) sparkline options shape — the whole block must be rewritten when
      // sparklines move onto the AG Charts engine in v33.
      cellRenderer: "agSparklineCellRenderer",
      cellRendererParams: {
        sparklineOptions: {
          type: "area",
          fill: "rgba(20, 110, 220, 0.2)",
          line: { stroke: "rgb(20, 110, 220)", strokeWidth: 2 },
          marker: { size: 2 },
          highlightStyle: { size: 5, fill: "rgb(20, 110, 220)" },
          axis: { stroke: "rgb(204, 214, 235)" },
          padding: { top: 5, bottom: 5 },
        },
      },
    },
  ]);

  // The separate Column API was deprecated in v31 and removed in v32 — these calls must move to
  // the Grid API (params.api.autoSizeAllColumns()).
  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.columnApi.autoSizeAllColumns();
  }, []);

  // Programmatic integrated chart over the price column.
  const onFirstDataRendered = useCallback((params: FirstDataRenderedEvent) => {
    params.api.createRangeChart({
      chartType: "groupedColumn",
      cellRange: { columns: ["make", "price"] },
      chartThemeOverrides: {
        common: { title: { enabled: true, text: "Price by make" } },
      },
    });
  }, []);

  return (
    <div className="ag-theme-alpine" style={{ width: "100%", height: 480 }}>
      <AgGridReact<Car>
        rowData={rowData}
        columnDefs={columnDefs}
        getRowId={(params) => params.data.id}
        components={{ priceRenderer: PriceRenderer }}
        // String selection form + suppressRowClickSelection — both deprecated in v32.2 in favour
        // of the object `rowSelection` form; must migrate by v35.
        rowSelection="multiple"
        suppressRowClickSelection
        // enableRangeSelection/enableCharts deprecated v32.2; enableRangeSelection removed v33
        // (RangeSelectionModule -> CellSelectionModule, cellSelection option).
        enableRangeSelection
        enableCharts
        onGridReady={onGridReady}
        onFirstDataRendered={onFirstDataRendered}
      />
    </div>
  );
}
