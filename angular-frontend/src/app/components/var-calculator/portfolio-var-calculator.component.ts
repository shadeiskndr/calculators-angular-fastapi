import { Component, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { TableModule } from "primeng/table";
import { InputTextModule } from "primeng/inputtext";
import { SelectModule } from "primeng/select";
import { InputNumberModule } from "primeng/inputnumber";
import { MessageModule } from "primeng/message";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { TabsModule } from "primeng/tabs";
import { IftaLabelModule } from "primeng/iftalabel";
import { Subject, takeUntil } from "rxjs";

import { VarApiService } from "../../services/var-api.service";
import {
  PortfolioVaRRequest,
  PortfolioVaRResponse,
  Position,
  RiskFactor,
} from "../../models/var.model";

@Component({
  selector: "portfolio-var-calculator",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    TableModule,
    InputTextModule,
    SelectModule,
    InputNumberModule,
    MessageModule,
    ProgressSpinnerModule,
    TabsModule,
    IftaLabelModule,
  ],
  templateUrl: "./portfolio-var-calculator.component.html",
})
export class PortfolioVarCalculatorComponent implements OnDestroy {
  Math = Math;
  positions: Position[] = [];
  riskFactors: RiskFactor[] = [];
  confidenceLevel: number = 95.0;
  selectedMethod: string = "historical";
  simulations: number = 10000;

  result: PortfolioVaRResponse | null = null;
  error: string = "";
  loading: boolean = false;
  activeResultTab: number = 0;

  private destroy$ = new Subject<void>();

  methodOptions = [
    { label: "Historical Simulation", value: "historical" },
    { label: "Parametric (Normal)", value: "parametric" },
    { label: "Monte Carlo Simulation", value: "monte_carlo" },
  ];

  constructor(private varApiService: VarApiService) {
    this.initializeDefaultData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeDefaultData() {
    // Add default risk factors
    this.addRiskFactor();
    this.riskFactors[0].name = "SP500";
    this.riskFactors[0].historical_returns = [
      0.012, -0.03, 0.018, -0.011, 0.027, 0.006, -0.022, 0.021, -0.015, 0.009,
    ];

    this.addRiskFactor();
    this.riskFactors[1].name = "EURUSD";
    this.riskFactors[1].historical_returns = [
      0.0015, -0.002, 0.0008, -0.0012, 0.0026, -0.0004, 0.0011, -0.0017, 0.0009,
      0.0,
    ];

    // Add default positions
    this.addPosition();
    this.positions[0].id = "equity_book";
    this.positions[0].current_value = 1500000;
    this.positions[0].sensitivities = { SP500: 1350000, EURUSD: -50000 };

    this.addPosition();
    this.positions[1].id = "fx_book";
    this.positions[1].current_value = 700000;
    this.positions[1].sensitivities = { SP500: 140000, EURUSD: 25000 };
  }

  addPosition() {
    const newPosition: Position = {
      id: `Position ${this.positions.length + 1}`,
      current_value: 1000000,
      sensitivities: {},
    };

    // Initialize sensitivities for existing risk factors
    this.riskFactors.forEach((rf) => {
      newPosition.sensitivities[rf.name] = 0;
    });

    this.positions.push(newPosition);
  }

  removePosition(index: number) {
    this.positions.splice(index, 1);
  }

  addRiskFactor() {
    const newRiskFactor: RiskFactor = {
      name: `RiskFactor${this.riskFactors.length + 1}`,
      historical_returns: [],
    };

    this.riskFactors.push(newRiskFactor);

    // Add sensitivity for this risk factor to all positions
    this.positions.forEach((position) => {
      position.sensitivities[newRiskFactor.name] = 0;
    });
  }

  removeRiskFactor(index: number) {
    const removedRiskFactor = this.riskFactors[index];
    this.riskFactors.splice(index, 1);

    // Remove sensitivity from all positions
    this.positions.forEach((position) => {
      delete position.sensitivities[removedRiskFactor.name];
    });
  }

  parseHistoricalReturns(input: string): number[] {
    return input
      .split(",")
      .map((n) => parseFloat(n.trim()))
      .filter((n) => !isNaN(n) && isFinite(n));
  }

  getTotalPortfolioValue(): number {
    return this.positions.reduce((sum, pos) => sum + pos.current_value, 0);
  }

  isValidConfiguration(): boolean {
    return (
      this.positions.length > 0 &&
      this.riskFactors.length > 0 &&
      this.riskFactors.every((rf) => rf.historical_returns.length >= 10) &&
      this.positions.every(
        (pos) => pos.id.trim().length > 0 && pos.current_value > 0
      ) &&
      this.confidenceLevel >= 80 &&
      this.confidenceLevel <= 99.99
    );
  }

  getTotalExposureForRiskFactor(riskFactorName: string): number {
    return this.positions.reduce((total, position) => {
      return total + (position.sensitivities[riskFactorName] || 0);
    }, 0);
  }

  getRiskFactorStd(returns: number[]): number {
    const mean = this.getRiskFactorMean(returns);
    const squaredDiffs = returns.map((value) => Math.pow(value - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((sum, value) => sum + value, 0) /
      (returns.length - 1);
    return Math.sqrt(avgSquaredDiff);
  }

  // Update existing methods for better accuracy
  getRiskFactorMean(returns: number[]): number {
    return returns.reduce((a, b) => a + b, 0) / returns.length;
  }

  getRiskFactorMin(returns: number[]): number {
    return Math.min(...returns);
  }

  getRiskFactorMax(returns: number[]): number {
    return Math.max(...returns);
  }

  calculatePortfolioVaR() {
    this.error = "";
    this.result = null;
    this.loading = true;

    if (!this.isValidConfiguration()) {
      this.error =
        "Please ensure all positions have valid values and all risk factors have at least 10 historical data points.";
      this.loading = false;
      return;
    }

    const request: PortfolioVaRRequest = {
      positions: this.positions,
      risk_factors: this.riskFactors,
      method: this.selectedMethod as any,
      confidence_level: this.confidenceLevel,
      simulations:
        this.selectedMethod === "monte_carlo" ? this.simulations : undefined,
    };

    this.varApiService
      .calculatePortfolioVaR(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Enhance the response with computed fields
          this.result = {
            ...response,
            total_portfolio_value: this.getTotalPortfolioValue(),
            positions_count: this.positions.length,
            risk_factors_count: this.riskFactors.length,
            simulations:
              this.selectedMethod === "monte_carlo"
                ? this.simulations
                : undefined,
          };
          this.loading = false;
        },
        error: (err) => {
          this.error = err.message;
          this.loading = false;
        },
      });
  }
}
