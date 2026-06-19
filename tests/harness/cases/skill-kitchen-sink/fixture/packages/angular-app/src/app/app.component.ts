import { Component } from "@angular/core";
import type { ColDef, GridOptions } from "ag-grid-community";
// @ag-grid-community/locale is NOT a legacy package — the skill must bump its version but must not
// flag it as a removed/legacy package to migrate away from.
import { AG_GRID_LOCALE_EN } from "@ag-grid-community/locale";
import { commonGridOptions, priceColumn } from "grid-config";

@Component({
  selector: "app-root",
  template: `
    <ag-grid-angular
      class="ag-theme-alpine"
      style="display: block; width: 100%; height: 480px"
      [rowData]="rowData"
      [columnDefs]="columnDefs"
      [gridOptions]="gridOptions"
      [localeText]="localeText"
    ></ag-grid-angular>
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
}
