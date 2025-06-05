import { Component } from "@angular/core";
import { AppTopbar } from "./components/app.topbar";
import { SingleVarCalculatorComponent } from "./components/var-calculator/single-var-calculator.component";
import { AppFooter } from "./components/app.footer";

@Component({
  selector: "app-root",
  imports: [AppTopbar, SingleVarCalculatorComponent, AppFooter],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {}
