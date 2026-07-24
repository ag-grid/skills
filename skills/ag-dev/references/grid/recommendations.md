# AG Grid — writing & debugging correct code

Where docs pages are provided below they are a slug, load the page from `https://www.ag-grid.com/archive/{major.minor.patch}/{framework}-data-grid/{slug}/` as described in documentation-index.md.

## Common mistakes

- The grid's container div needs an explicit height. Under the default `domLayout:'normal'` the grid fills the parent div. If this div has no intrinsic height, the grid will have zero height. Load the `grid-size` documentation page for the appropriate framework and version for more details.
- Always supply `getRowId` when data will be updated. It must be a **pure** function returning a **unique, stable string** per row. Docs: `row-ids`
- By default change detection compares object/array **references**, mutating data in place will not trigger an update. Many small updates can be batched for performance using transactions. When writing code that provides and updates data use the documentation index to find the "Updating Data" pages.
- `colDef.field` supports a dot notation nested path: `field:'address.city'` reads `data.address.city`. If a key literally contains a dot use a `valueGetter` (`p => p.data['S.No']`). Docs: `value-getters`
- Column filters are selected by **registered component name**, not free-form strings: `filter:true` (default text), `filter:'agNumberColumnFilter'`, `filter:'agDateColumnFilter'` etc. Docs: `filtering`
- Pick the right row model for a project. Client Side Row Model: data loaded up front and stored in browser memory. Server Side Row Model (SSRM): loads data on demand from a server. Infinite Row Model and Viewport Row Model: much less common as SSRM is the default for server-side data, consult docs before using.
- The grid defines its own set of events, in past tense. For example, `onCellClicked`, not the DOM-style `onClick`.

### Major version transitions

- From version 33, Theming API (`import { themeQuartz } from "ag-grid-community"`) is the standard way of styling a grid. Avoid using Legacy Themes (Linking `ag-grid.css`) unless maintaining an application that was created before v33.
- From version 33, module objects are imported from `ag-grid-community` or `ag-grid-enterprise` and registered with e.g. `ModuleRegistry.registerModules([AllCommunityModule])`.
  - When prototyping, register `AllCommunityModule` and `AllEnterpriseModule` to get all features, and leave a TODO comment above suggesting that these should be replaced with more fine grained modules later.
  - Org scoped feature packages (@ag-grid-community/*) stopped being updated after 32.x
- From version 31, `javascript` grids use `createGrid()` which _returns_ the api object, previous versions used `new Grid(options)` and mutated the options setting `options.api`.

## Enable development mode debugging and pay attention to console messages

AG products log error information to the console when configured to do so. Enabling these validations _significantly_ improves AI agent development experience allowing the agent to diagnose and fix issues.

Enable development time validations for higher quality messages without inflating production bundle size.

1. Conditionally bundle validation code

```ts
if (process.env.NODE_ENV !== "production") {
  enableDevValidations(); // for v36
  // ModuleRegistry.registerModules([ValidationModule]); // for v35 and below
}
```

2. Where practical, include a real browser in the verification loop, e.g. using Chrome MCP or Playwright, and look out for console messages.

## Angular

- Angular `@Output` events drop the `on` prefix: bind `(cellClicked)`, `(gridReady)`, `(selectionChanged)` — not `(onCellClicked)`/`(onGridReady)`.

## React

Stabilise every non-primitive prop by reference; a new reference each render forces a grid update.

- `rowData`/`columnDefs` via `useState` or `useMemo` — a fresh array resets column state and row selection.
- Object props (`defaultColDef`, `sideBar`, `statusBar`) via `useState`/`useMemo`; function grid options (e.g. `isRowSelectable`) via `useCallback` with correct deps.
- Event handler props (`onCellClicked` etc.) need no `useCallback` (they don't trigger grid updates).
- Pass custom cell components by reference (optionally `memo()`), not by registered string name.
- To detect excessive rendering, set `debug={true}` to log "Updated property …" on each changed prop — use it to spot re-renders caused by unmemoised props.
