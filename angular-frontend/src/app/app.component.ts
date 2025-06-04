import { Component } from "@angular/core";
import { AppTopbar } from "./components/app.topbar";
import { SingleVarCalculatorComponent } from "./components/var-calculator/single-var-calculator.component";
import { BatchVarCalculatorComponent } from "./components/var-calculator/batch-var-calculator.component";
import { AppFooter } from "./components/app.footer";
import { TabsModule } from "primeng/tabs";

@Component({
  selector: "app-root",
  imports: [
    AppTopbar,
    SingleVarCalculatorComponent,
    BatchVarCalculatorComponent,
    AppFooter,
    TabsModule,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  activeTab: number = 0;
}
