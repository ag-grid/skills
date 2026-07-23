<!-- keep in sync with ag-update/references/packages.md (opposite stance: ag-update pins theme:"legacy" and does NOT migrate) -->

# AG Grid — stale patterns vs current

Training data is saturated with pre-v33 AG Grid. For **new code** at v33+, prefer the Theming API and current module registration below. (Latest published grid is v36; these transitions all pivot on v33.)

## 1. Module registration (v33) — mandatory
Pre-v33 code either used the fat auto-registering "packages" or the scoped `@ag-grid-community/*` / `@ag-grid-enterprise/*` module packages. **v33 removed the scoped packages**; modules now import from the single `ag-grid-community` / `ag-grid-enterprise` packages and **must be registered before any grid is created** (except the UMD/CDN bundle, which auto-registers). Forgetting registration → runtime **error #200** (or a bare number/link in production).
```js
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
ModuleRegistry.registerModules([ AllCommunityModule ]);   // or AllEnterpriseModule
```
`AllCommunityModule` / `AllEnterpriseModule` reproduce the old all-features behaviour — the least error-prone default unless the user wants tree-shaking (then register only the named modules).
Docs: https://www.ag-grid.com/javascript-data-grid/upgrading-to-ag-grid-33/#migrating-from-packages

## 2. Theming API (v33 default)
Legacy = CSS-file themes (`import 'ag-grid-community/styles/ag-grid.css'` + `class="ag-theme-quartz"`). v33 made the **Theming API** (a JS theme object on the `theme` grid option) the default; legacy CSS themes are deprecated but still shipped. New code: use a theme object, no CSS import, no wrapper class.
```js
import { themeQuartz } from 'ag-grid-community';
const gridOptions = { theme: themeQuartz };  // .withParams({...}) to configure
```
Loading a CSS-file theme alongside the default Theming API breaks styling (**error #239/#106**). To deliberately stay on legacy CSS themes, set `theme:'legacy'`. `TODO: verify` legacy removal version (not yet announced).
Docs: https://www.ag-grid.com/javascript-data-grid/theming-migration/

## 3. v33 package / module renames (LLMs emit the old names)
| Legacy (≤ v32) | Current (v33+) |
|---|---|
| `@ag-grid-community/*`, `@ag-grid-enterprise/*` scoped packages | `ag-grid-community` / `ag-grid-enterprise` (single, tree-shakable) |
| `@ag-grid-community/{react,angular,vue3}` | `ag-grid-{react,angular,vue3}` |
| `ag-grid-charts-enterprise` package | `AgChartsEnterpriseModule` from `ag-grid-enterprise` |
| `MenuModule` | `ColumnMenuModule` + `ContextMenuModule` |
| `RangeSelectionModule` | `CellSelectionModule` |
| `GridChartsModule` | `IntegratedChartsModule` |
| `RowGroupingModule` | split into separate modules (use the Module Selector) |

Not renamed: `@ag-grid-community/locale`.

## Removed option names (older majors, still in training data)
- `cellRendererFramework` → `cellRenderer`; `frameworkComponents` → `components` (removed v30)
- `columnApi` removed → methods moved onto grid `api` (v31); `api.setRowData()`/`setColumnDefs()` → `api.setGridOption('rowData'|'columnDefs', …)` (v31)
- `rowSelection:"multiple"` → `rowSelection:{ mode:'multiRow' }`; `enableRangeSelection` → `cellSelection`; colDef `checkboxSelection`/`headerCheckboxSelection` → `rowSelection.checkboxes`/`.headerCheckbox`; `suppressRowClickSelection` → `rowSelection.enableClickSelection`; `groupSelectsChildren` → `rowSelection.groupSelects` (v32.2)
- `api.setQuickFilter()` → `api.setGridOption('quickFilterText', …)` `TODO: verify` version
