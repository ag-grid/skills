// v31 module registration using the legacy scoped feature packages. This whole layout is removed
// in v33 (package consolidation): scoped packages collapse into ag-grid-community /
// ag-grid-enterprise, GridChartsModule becomes IntegratedChartsModule.with(AgChartsEnterpriseModule)
// with ag-charts-enterprise as a separate dependency, and RangeSelectionModule becomes
// CellSelectionModule.
import { ModuleRegistry } from "@ag-grid-community/core";
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model";
import { RangeSelectionModule } from "@ag-grid-enterprise/range-selection";
import { GridChartsModule } from "@ag-grid-enterprise/charts-enterprise";
import { SparklinesModule } from "@ag-grid-enterprise/sparklines";
import { MenuModule } from "@ag-grid-enterprise/menu";

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  RangeSelectionModule,
  GridChartsModule,
  SparklinesModule,
  MenuModule,
]);
