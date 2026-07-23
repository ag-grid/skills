# AG Grid — writing & debugging correct code

Rules an LLM gets wrong by default. Assumes current AG Grid (v33+). For legacy/stale patterns (module registration, theming, renamed options) see `versions.md`; for edition gating see `capabilities.md`; for numbered console errors see the SKILL router.

## Symptom → cause lookup

| Symptom | Cause → rule |
|---|---|
| Grid mounts but is blank / 0px tall | Container has no resolvable height → **Container height** |
| Configured feature does nothing (filter, grouping, renderer, export…) | **Not silent — check the console.** v33+ emits **#200** for an unregistered module (register it → `versions.md`); an unlicensed Enterprise feature shows a watermark + console warning → `capabilities.md` |
| Grid unstyled / double-styled after v33 | Theming API + legacy CSS both loaded → `versions.md` |
| Selection / scroll / expanded groups reset on every data update | Missing or unstable `getRowId` → **Row identity** |
| Changed a value in the data, cell still shows old value | In-place mutation keeps same object reference → **Immutable updates** |
| Column header shows but every cell is blank | `field` mismatches the data key, or a dotted key misread as a path → **Field mapping** |
| Sort / filter / group / export use the raw not the displayed value | Formatting done in `valueFormatter` when the *value* needed deriving → **Value pipeline** |
| React: columns snap back to defaults, selection clears on parent render | New prop references each render → **React: stable references** |
| Event handler never fires | Wrong event name (`onCellClick` vs `onCellClicked`) → **React: event names** |
| "Could not find component" for a renderer/editor/filter | Referenced by an unregistered string name → **Value pipeline** / register or pass reference |

---

## General

### Container height
Default `domLayout:'normal'` fills the container's height; a container with no resolvable height collapses to 0px and nothing shows. `height:100%` fails when an ancestor has no height. Give the grid div an explicit resolvable height (e.g. `500px`, or a flex/viewport height), OR set `domLayout:'autoHeight'` and then do NOT set a height on the div (autoHeight renders all rows to the DOM — avoid with large row counts). Debug: put a border on the div; if it's the wrong size, the container (not the grid) is the problem.
Docs: https://www.ag-grid.com/javascript-data-grid/grid-size/

### Row identity — `getRowId`
Always supply `getRowId` when data will be updated. It must be a **pure** function returning a **unique, stable string** per row from a business key: `getRowId: (p) => String(p.data.id)`. Without it, the grid rebuilds every row from scratch on each `rowData` set and loses all per-row state (selection, scroll, expansion). Do NOT derive the id from row index (breaks on sort/filter/reorder) or a mutable/non-unique field. A number return, or an unstable id (`Math.random()`), also breaks identity. (Duplicate ids emit console warning #2; the state loss itself is silent.)
Docs: https://www.ag-grid.com/javascript-data-grid/row-ids/

### Immutable updates
Change detection compares object/array **references**. To update, produce a **new object** for the changed row and a **new array** for the list; keep unchanged rows as the same reference. Mutating in place (`rows[0].price = 99`) leaves the reference unchanged, so the grid sees no change and the cell stays stale.
```js
// WRONG — same references, no refresh
rows[0].price = 99; api.setGridOption('rowData', rows);
// RIGHT — new row object, new array
api.setGridOption('rowData', rows.map(r => r.id === 5 ? { ...r, price: 99 } : r));
```
For cells whose value is a mutable object, triple-equals reference comparison won't detect internal changes — supply `colDef.equals(a,b)`. For targeted or high-frequency updates prefer `api.applyTransaction({ add, update, remove })` (or `applyTransactionAsync` for streaming) over replacing all `rowData`; `applyTransaction` takes a transaction **object**, not a bare array, and needs `getRowId` to match `update`/`remove` by id.
Docs: https://www.ag-grid.com/javascript-data-grid/row-ids/ , https://www.ag-grid.com/javascript-data-grid/data-update-transactions/

### Field mapping
`colDef.field` must match the row property exactly (case-sensitive); a mismatch yields blank cells with no error. Dot notation is a **nested path**: `field:'address.city'` reads `data.address.city`. So a key that literally contains a dot (e.g. `"S.No"`) is misread as a path and renders blank — use a `valueGetter` (`p => p.data['S.No']`) for such keys. Use plain dot-notation `field` for genuine nesting; reserve `valueGetter` for computed values, not to hand-roll a lookup dot notation already does.
Docs: https://www.ag-grid.com/javascript-data-grid/value-getters/

### Value pipeline: field / valueGetter / valueFormatter / cellRenderer / cellEditor
Pipeline: `field | valueGetter` (get/derive the value) → `valueFormatter` (format to text) → `cellRenderer` (produce DOM). `cellEditor` is a separate edit-mode path (`valueParser` → `valueSetter`).

| Need | Use |
|---|---|
| Map a plain property (incl. nested via dots) | `field` |
| Derive/compute a value | `valueGetter` (must be **pure** — called once per redraw and reused) |
| Change how the value *looks* as text (currency, dates, "N/A") | `valueFormatter` (returns a **string**) |
| Buttons, links, images, badges, components | `cellRenderer` |
| Let the user edit in place | `editable:true` + `cellEditor` |

Distinctions models get wrong:
- **`valueFormatter` is display-only** — sort/filter/group/export use the raw value (or `valueGetter` result), never the formatted string. Format `1000` as `"$1,000"` and it still sorts as `1000`. To change the value the grid *operates on*, use `valueGetter`, not `valueFormatter`.
- **`valueFormatter` must return a string; it cannot emit markup** (output is escaped and shows as literal text). For HTML/components use `cellRenderer`. Conversely don't reach for a `cellRenderer` to do plain text formatting.
- **`cellRenderer` takes a component/function reference, not instantiated JSX**: `cellRenderer: StatusBadge` (+ `cellRendererParams`), not `cellRenderer: <StatusBadge/>`. The grid instantiates it with cell params.
- A renderer/editor/filter referenced by **string name** must be built-in or registered in `components`; otherwise pass the reference directly.

### Column config
`defaultColDef` applies shared props (`sortable`, `filter`, `resizable`, …) to all columns once — set them there rather than repeating on every `colDef`. Column filters are selected by **registered component name**, not free-form strings: `filter:true` (default text), `filter:'agNumberColumnFilter'`, `filter:'agDateColumnFilter'`. (`agSetColumnFilter`/`agMultiColumnFilter` are Enterprise — see `capabilities.md`.)
Docs: https://www.ag-grid.com/javascript-data-grid/filtering/

### Which row model
One `rowModelType` per grid: `'clientSide'` (default), `'infinite'`, `'serverSide'`, `'viewport'`. Do not switch off Client-Side just because "the data is big".
- **Client-Side** (default, Community): all data in browser; grid does sort/filter/group/pivot/aggregate. Handles 100k+ rows (only visible rows render). **Start here unless a constraint forces otherwise.**
- **Infinite** (Community): large **flat** list loaded in blocks as you scroll; server does sort/filter. No grouping/pivot.
- **Server-Side / SSRM** (Enterprise): large data with server-side grouping/aggregation/pivot/tree data; preferred over Infinite for Enterprise users even for flat data.
- **Viewport** (Enterprise): server must know exactly which rows are on screen (targeted push). Rarely needed — don't reach for it by default.

Docs: https://www.ag-grid.com/javascript-data-grid/row-models/
`TODO: verify` no hard Client-Side row-count cutoff (docs say ~100k+ workable, no fixed number); `rowModelType` enum strings.

---

## React

The dominant React failure: passing **new references each render** for object/array/function grid props. The grid treats a new reference as a changed prop and resets state — columns snap back to their defs, selection/filters clear, plus wasted work.
```jsx
// WRONG — new array/object/function every render
<AgGridReact rowData={rows}
  columnDefs={[{field:'name'}]}      // new array
  defaultColDef={{sortable:true}}    // new object
  getRowId={p => String(p.data.id)}/>// new fn
// RIGHT — stable references
const [rowData] = useState(() => loadRows());        // useState for data you mutate
const columnDefs = useMemo(() => [{field:'name'}], []);
const defaultColDef = useMemo(() => ({sortable:true}), []);
const getRowId = useCallback(p => String(p.data.id), []);
```
- `columnDefs` / `rowData` / object props (`defaultColDef`, `sideBar`, `statusBar`, `autoGroupColumnDef`): `useMemo` (or `useState` if you mutate them).
- Function options (`getRowId`, `isRowSelectable`, `getRowStyle`): `useCallback` with a **correct dependency array** — empty deps can capture a stale value; include what the fn reads (`useCallback(n => n.data.v > count, [count])`).
- **Simple props don't need memoisation** — `rowHeight`, `pagination`, strings/numbers/booleans compare by value; wrapping them adds noise.
- Diagnose churn with `<AgGridReact debug={true}/>` — logs when a prop reference changed. `TODO: verify` exact log wording.

Docs: https://www.ag-grid.com/react-data-grid/react-hooks/

### React: event names
AG Grid handler props are past-tense grid events, not DOM-style names — a misnamed prop is silently ignored: `onCellClicked`, `onRowClicked`, `onSelectionChanged`, `onCellValueChanged`, `onGridReady` (NOT `onCellClick`/`onSelectionChange`/`onChange`). Read the selection from the API, not the event: `e.api.getSelectedRows()` / `e.api.getSelectedNodes()` — the event payload has no `selectedRows`.
Docs: https://www.ag-grid.com/javascript-data-grid/row-selection/

---

## Angular
Enable `eventCoalescing` and `runCoalescing` (via `provideZoneChangeDetection` at bootstrap) — the grid runs internally outside NgZone; coalescing batches change-detection and avoids excessive CD cycles on large datasets. Irrelevant for Angular 21+ zoneless apps. Mutable-object cell values need `colDef.equals` (see Immutable updates).
Docs: https://www.ag-grid.com/angular-data-grid/angular-ngzone/

## Vue
Change-detection rules are framework-agnostic (see Immutable updates / transactions). `TODO: verify` any Vue-specific do/don'ts — research surfaced little beyond "Column State is provided via Column Definitions to be reactive". https://www.ag-grid.com/vue-data-grid/change-detection/

## Vanilla (`createGrid`)
Create the grid once, keep the returned `api`, and update in place via the API (`applyTransaction`, `setGridOption('rowData', …)`) — do not destroy/recreate to update, which discards all state. Everything under General applies directly. `TODO: verify` a doc-quoted statement of API longevity.
