<template>
  <ag-grid-vue
    class="ag-theme-alpine"
    style="width: 100%; height: 400px"
    :columnDefs="columnDefs"
    :rowData="rowData"
  />
</template>

<script>
import { AgGridVue } from "ag-grid-vue";
import "ag-grid-community/dist/styles/ag-grid.css";
import "ag-grid-community/dist/styles/ag-theme-alpine.css";

export default {
  name: "App",
  components: { AgGridVue },
  data() {
    return {
      columnDefs: [{ field: "make" }, { field: "model" }, { field: "price" }],
      rowData: [
        { make: "Tesla", model: "Model Y", price: 64950 },
        { make: "Ford", model: "F-Series", price: 33850 },
      ],
    };
  },
};
</script>
