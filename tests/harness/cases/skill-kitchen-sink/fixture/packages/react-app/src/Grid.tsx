import { useCallback, useState } from "react";
import { AgGridReact } from "@ag-grid-community/react";
import type {
  ColDef,
  FirstDataRenderedEvent,
  GridOptions,
  GridReadyEvent,
} from "@ag-grid-community/core";
import { AgChartsReact } from "ag-charts-react";
import type { AgChartOptions } from "ag-charts-community";
import { chartOptions, commonGridOptions, priceColumn } from "grid-config";
import "./ag-modules";
import { PriceRenderer } from "./PriceRenderer";
// Legacy CSS theming: structural styles + the Alpine theme, then the custom overrides.
// At v33+ these CSS imports stop applying unless `theme="legacy"` is set, or the look is ported
// to the Theming API.
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
  // Non-generic ColDef[] so the shared grid-config column (typed against its own AG version) fits.
  const [columnDefs] = useState<ColDef[]>([
    { field: "make" },
    { field: "model" },
    {
      // Column definition comes from the shared grid-config library (version-skewed types, hence
      // the cast); the local class renderer is layered on top.
      ...(priceColumn() as unknown as ColDef),
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

  // Standalone AG Charts options come from the shared grid-config library too (charts v9, paired
  // with grid v31). Cast at the boundary for the version-skewed shared types.
  const chart = chartOptions() as unknown as AgChartOptions;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12 }}>
      <div className="ag-theme-alpine" style={{ width: "100%", height: 320 }}>
        <AgGridReact
          // Shared options (string rowSelection + suppressRowClickSelection) come from the shared
          // grid-config library and must migrate there.
          gridOptions={commonGridOptions() as unknown as GridOptions}
          rowData={rowData}
          columnDefs={columnDefs}
          getRowId={(params) => params.data.id}
          components={{ priceRenderer: PriceRenderer }}
          // enableRangeSelection (enterprise) deprecated v32.2 → cellSelection + CellSelectionModule
          // in v33; enableCharts deprecated v32.2; integrated charts move behind IntegratedChartsModule.
          enableRangeSelection
          enableCharts
          onGridReady={onGridReady}
          onFirstDataRendered={onFirstDataRendered}
        />
      </div>
      {/* Standalone AG Charts, rendered next to the grid in the same view. */}
      <div style={{ width: "100%", height: 320 }}>
        <AgChartsReact options={chart} />
      </div>
    </div>
  );
}
