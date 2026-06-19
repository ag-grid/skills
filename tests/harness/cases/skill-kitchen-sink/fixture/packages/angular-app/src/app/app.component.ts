import { Component } from "@angular/core";
import type { ColDef, GridOptions } from "ag-grid-community";
import type { AgChartOptions } from "ag-charts-community";
// @ag-grid-community/locale is NOT a legacy package — the skill must bump its version but must not
// flag it as a removed/legacy package to migrate away from.
import { AG_GRID_LOCALE_EN } from "@ag-grid-community/locale";
import { chartOptions, commonGridOptions, priceColumn } from "grid-config";

@Component({
  selector: "app-root",
  template: `
    <ag-grid-angular
      class="ag-theme-alpine"
      style="display: block; width: 100%; height: 320px"
      [rowData]="rowData"
      [columnDefs]="columnDefs"
      [gridOptions]="gridOptions"
      [localeText]="localeText"
    ></ag-grid-angular>
    <!-- Standalone AG Charts, rendered next to the grid in the same view. -->
    <ag-charts style="display: block; width: 100%; height: 320px" [options]="chart"></ag-charts>
  `,
})
export class AppComponent {
  rowData = [
    { make: "Tesla", model: "Model Y", price: 64950 },
    { make: "Ford", model: "F-Series", price: 33850 },
    { make: "Toyota", model: "Corolla", price: 29600 },
  ];

  // Consumes the shared grid-config library (version-skewed: this app is on AG 32, grid-config is
  // on AG 31). Casts bridge the minor cross-version type differences.
  columnDefs: ColDef[] = [
    { field: "make" },
    { field: "model" },
    priceColumn() as ColDef,
  ];

  gridOptions: GridOptions = commonGridOptions() as GridOptions;

  localeText: Record<string, string> = AG_GRID_LOCALE_EN;

  // Standalone chart options from the shared lib (charts v9 there, v10 here → cast at the boundary).
  chart: AgChartOptions = chartOptions() as unknown as AgChartOptions;
}
