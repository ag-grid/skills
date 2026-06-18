import { useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
} from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Car {
  make: string;
  model: string;
  price: number;
}

export function Grid() {
  const [rowData] = useState<Car[]>([{ make: "Tesla", model: "Model Y", price: 64950 }]);
  const [columnDefs] = useState<ColDef<Car>[]>([
    { field: "make" },
    { field: "model" },
    { field: "price" },
  ]);
  return (
    <div style={{ width: "100%", height: 400 }}>
      <AgGridReact theme={themeQuartz} rowData={rowData} columnDefs={columnDefs} />
    </div>
  );
}
