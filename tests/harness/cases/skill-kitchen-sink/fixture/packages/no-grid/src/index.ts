// This package depends on the unrelated npm package literally named "grid" (a DOM grid component
// by gridgrid/grid) — NOT AG Grid. It is a decoy: the upgrade skill must NOT mistake this for an
// AG package and must leave it completely untouched. There are no `ag-grid-*` / `ag-charts-*`
// dependencies or imports anywhere in this package.
import * as grid from "grid";

export const layoutEngine = grid;

export function describe(): string {
  return "non-ag grid layout helper (npm 'grid' package)";
}
