import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Grid } from "./Grid";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Grid />
  </StrictMode>,
);
