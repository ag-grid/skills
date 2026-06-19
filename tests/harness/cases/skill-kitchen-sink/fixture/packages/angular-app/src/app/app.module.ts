import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
// v32 idiom: the AgGridModule NgModule. In v33 this is replaced by the standalone AgGridAngular
// component (imported directly into a standalone component / module imports), and Angular's minimum
// supported version rises to 17.
import { AgGridModule } from "ag-grid-angular";
import { AppComponent } from "./app.component";

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, AgGridModule],
  bootstrap: [AppComponent],
})
export class AppModule {}
