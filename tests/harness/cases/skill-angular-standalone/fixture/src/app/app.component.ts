import { Component } from "@angular/core";
import type { ColDef } from "ag-grid-community";

@Component({
  selector: "app-root",
  template: `<ag-grid-angular
    class="ag-theme-quartz"
    style="width: 100%; height: 400px"
    [rowData]="rowData"
    [columnDefs]="columnDefs"
  ></ag-grid-angular>`,
})
export class AppComponent {
  rowData = [
    { make: "Tesla", model: "Model Y", price: 64950 },
    { make: "Ford", model: "F-Series", price: 33850 },
  ];
  columnDefs: ColDef[] = [{ field: "make" }, { field: "model" }, { field: "price" }];
}
