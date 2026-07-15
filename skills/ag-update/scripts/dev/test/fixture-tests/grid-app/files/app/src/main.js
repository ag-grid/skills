import { createGrid } from 'ag-grid-community';

const api = createGrid(document.body, { columnDefs: [] });
api.oldGridApi();
