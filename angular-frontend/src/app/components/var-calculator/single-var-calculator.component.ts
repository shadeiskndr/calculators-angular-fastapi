import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { IftaLabelModule } from "primeng/iftalabel";
import { InputTextModule } from "primeng/inputtext";
import { MessageModule } from "primeng/message";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { DividerModule } from "primeng/divider";
import { DropdownModule } from "primeng/dropdown";
import { InputNumberModule } from "primeng/inputnumber";
import { CardModule } from "primeng/card";
import { TabsModule } from "primeng/tabs";
import { TableModule } from "primeng/table";
import { Subject, takeUntil } from "rxjs";

import { VarApiService } from "../../services/var-api.service";
import { BatchVarCalculatorComponent } from "./batch-var-calculator.component";

import { VaRMethod, VaRRequest, VaRResponse } from "../../models/var.model";

interface MethodOption {
  label: string;
  value: VaRMethod;
  description: string;
  disabled?: boolean;
}

@Component({
  selector: "single-var-calculator",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    IftaLabelModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
    DividerModule,
    DropdownModule,
    InputNumberModule,
    CardModule,
    TabsModule,
    TableModule,
    BatchVarCalculatorComponent,
  ],
  templateUrl: "./single-var-calculator.component.html",
})
export class SingleVarCalculatorComponent implements OnInit, OnDestroy {
  // Main tab control
  activeMainTab: number = 0;

  // Single VaR Calculator properties
  numbersInput: string =
    "-2.5, -1.0, 0.5, 1.0, 2.0, 3.0, -3.0, -0.5, 1.5, -1.5, 2.5, -2.0";
  confidenceLevel: number = 95.0;
  selectedMethod: VaRMethod = VaRMethod.HISTORICAL;

  result: VaRResponse | null = null;
  error: string = "";
  loading: boolean = false;
  parsedNumbers: number[] = [];
  activeResultTab: number = 0;

  private destroy$ = new Subject<void>();

  methodOptions: MethodOption[] = [
    {
      label: "Historical Simulation",
      value: VaRMethod.HISTORICAL,
      description: "Uses actual historical data distribution",
    },
    {
      label: "Parametric (Normal)",
      value: VaRMethod.PARAMETRIC,
      description: "Assumes normal distribution of returns",
    },
    {
      label: "Monte Carlo",
      value: VaRMethod.MONTE_CARLO,
      description: "Simulation-based approach (coming soon)",
      disabled: true,
    },
  ];

  constructor(private varApiService: VarApiService) {}

  ngOnInit() {
    this.parseNumbers();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  parseNumbers() {
    this.parsedNumbers = this.numbersInput
      .split(",")
      .map((n) => parseFloat(n.trim()))
      .filter((n) => !isNaN(n) && isFinite(n));
  }

  isValidInput(): boolean {
    this.parseNumbers();
    return (
      this.parsedNumbers.length >= 10 &&
      this.confidenceLevel >= 80 &&
      this.confidenceLevel <= 99.99
    );
  }

  getMethodDescription(): string {
    const method = this.methodOptions.find(
      (m) => m.value === this.selectedMethod
    );
    return method?.description || "";
  }

  calculateVaR() {
    this.error = "";
    this.result = null;
    this.loading = true;

    if (!this.isValidInput()) {
      this.error =
        "Please enter at least 10 valid numbers and ensure confidence level is between 80-99.99%";
      this.loading = false;
      return;
    }

    const request: VaRRequest = {
      numbers: this.parsedNumbers,
      confidence_level: this.confidenceLevel,
      method: this.selectedMethod,
    };

    this.varApiService
      .calculateVaR(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.result = response;
          this.loading = false;
        },
        error: (err) => {
          this.error = err.message;
          this.loading = false;
        },
      });
  }
}
