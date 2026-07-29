import { useMemo } from "react";
import { AgStudio } from "ag-studio-react";
import type { AgDataSourcesDefinition } from "ag-studio";
import { formats } from "./formats";
import { widgets } from "./widgets";
import { dashboardTheme } from "./theme";
import { savedReport } from "./initialState";

const SALES = [
  { region: "North", orderDate: "2026-01-15", shippedDate: "2026-02-03", amount: 1200 },
  { region: "South", orderDate: "2026-01-22", shippedDate: "2026-02-11", amount: 3400 },
  { region: "East", orderDate: "2026-02-02", shippedDate: "2026-02-19", amount: 780 },
  { region: "West", orderDate: "2026-02-14", shippedDate: "2026-03-01", amount: 5600 },
];

export function Dashboard() {
  const data = useMemo<AgDataSourcesDefinition>(
    () => ({ sources: [{ id: "sales", data: SALES }], formats }),
    [],
  );

  const initialState = useMemo(() => savedReport, []);

  return (
    <div className="dashboard-shell">
      <AgStudio
        data={data}
        mode="edit"
        theme={dashboardTheme}
        widgets={widgets}
        initialState={initialState}
      />
    </div>
  );
}
