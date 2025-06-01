import { Component } from "@angular/core";
import { AppTopbar } from "./components/app.topbar";
import { SingleVarCalculatorComponent } from "./components/var/single-var-calculator.component";
import { BatchVarCalculatorComponent } from "./components/var/batch-var-calculator.component";
import { AppFooter } from "./components/app.footer";
import { TabViewModule } from "primeng/tabview";

@Component({
  selector: "app-root",
  imports: [
    AppTopbar,
    SingleVarCalculatorComponent,
    BatchVarCalculatorComponent,
    AppFooter,
    TabViewModule,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {}
