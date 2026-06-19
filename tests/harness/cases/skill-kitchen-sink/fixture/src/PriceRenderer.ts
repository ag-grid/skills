import type { ICellRendererComp, ICellRendererParams } from "@ag-grid-community/core";

// Class-based cell renderer, registered by key via the grid's `components` map.
// (frameworkComponents was removed in v31, so `components` is the only option here.)
// Class renderers still work at v35, but the surrounding APIs around them do not.
export class PriceRenderer implements ICellRendererComp {
  private eGui!: HTMLSpanElement;

  init(params: ICellRendererParams): void {
    this.eGui = document.createElement("span");
    this.render(params);
  }

  getGui(): HTMLElement {
    return this.eGui;
  }

  refresh(params: ICellRendererParams): boolean {
    this.render(params);
    return true;
  }

  private render(params: ICellRendererParams): void {
    const value = Number(params.value ?? 0);
    this.eGui.textContent = `$${value.toLocaleString()}`;
    this.eGui.style.color = value > 40000 ? "#b00020" : "#0a7d2c";
    this.eGui.style.fontWeight = "600";
  }
}
