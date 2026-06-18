import { Grid, type ColDef, type GridOptions } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

interface Car {
  make: string;
  model: string;
  price: number;
}

const columnDefs: ColDef<Car>[] = [{ field: "make" }, { field: "model" }, { field: "price" }];
const rowData: Car[] = [
  { make: "Tesla", model: "Model Y", price: 64950 },
  { make: "Ford", model: "F-Series", price: 33850 },
];

const gridOptions: GridOptions<Car> = { columnDefs, rowData };

const eGrid = document.querySelector<HTMLElement>("#app")!;
eGrid.className = "ag-theme-quartz";
// eslint-disable-next-line no-new
new Grid(eGrid, gridOptions);
