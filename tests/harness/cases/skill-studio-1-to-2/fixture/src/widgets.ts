import { createWidgets } from "ag-studio";

// Studio v1 configures built-in widgets through `overrides`, and a widget's
// toolbar buttons through the `toolbar` array on the widget definition.
export const widgets = createWidgets({
  overrides: [
    {
      id: "grid",
      toolbar: [
        { type: "button", label: "Export", icon: "check", id: "export-csv" },
      ],
      featureConfig: {
        crossFilter: { supportsHighlight: true },
        csvExport: true,
      },
    },
  ],
});
