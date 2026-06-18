import { useState } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import type { ColDef } from "ag-grid-community";

interface Car {
  make: string;
  model: string;
  price: number;
}

export function Grid() {
  const [rowData] = useState<Car[]>([
    { make: "Tesla", model: "Model Y", price: 64950 },
    { make: "Ford", model: "F-Series", price: 33850 },
  ]);
  const [columnDefs] = useState<ColDef<Car>[]>([
    { field: "make" },
    { field: "model" },
    { field: "price" },
  ]);

  return (
    <div className="ag-theme-quartz" style={{ width: "100%", height: 400 }}>
      <AgGridReact rowData={rowData} columnDefs={columnDefs} />
    </div>
  );
}
