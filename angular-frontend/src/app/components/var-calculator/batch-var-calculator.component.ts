import { Component, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { TableModule } from "primeng/table";
import { InputTextModule } from "primeng/inputtext";
import { DropdownModule } from "primeng/dropdown";
import { InputNumberModule } from "primeng/inputnumber";
import { MessageModule } from "primeng/message";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { TooltipModule } from "primeng/tooltip";
import { Subject, takeUntil } from "rxjs";

import { VarApiService } from "../../services/var-api.service";
import { VaRMethod, VaRRequest, BatchVaRResult } from "../../models/var.model";

interface DatasetInput {
  id: number;
  name: string;
  numbersInput: string;
  confidenceLevel: number;
  method: VaRMethod;
  parsedNumbers: number[];
  isValid: boolean;
}

@Component({
  selector: "batch-var-calculator",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    TableModule,
    InputTextModule,
    DropdownModule,
    InputNumberModule,
    MessageModule,
    ProgressSpinnerModule,
    TooltipModule,
  ],
  templateUrl: "./batch-var-calculator.component.html",
})
export class BatchVarCalculatorComponent implements OnDestroy {
  datasets: DatasetInput[] = [];
  results: BatchVaRResult[] = [];
  loading = false;
  error = "";

  private destroy$ = new Subject<void>();
  private nextId = 1;

  methodOptions = [
    { label: "Historical Simulation", value: VaRMethod.HISTORICAL },
    { label: "Parametric (Normal)", value: VaRMethod.PARAMETRIC },
    { label: "Monte Carlo Simulation", value: VaRMethod.MONTE_CARLO },
  ];

  constructor(private varApiService: VarApiService) {
    this.addDataset(); // Start with one dataset
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addDataset() {
    if (this.datasets.length >= 10) return;

    const dataset: DatasetInput = {
      id: this.nextId++,
      name: `Dataset ${this.datasets.length + 1}`,
      numbersInput: "",
      confidenceLevel: 95.0,
      method: VaRMethod.HISTORICAL,
      parsedNumbers: [],
      isValid: false,
    };

    this.datasets.push(dataset);
  }

  removeDataset(index: number) {
    this.datasets.splice(index, 1);
    // Update results if they exist
    if (this.results.length > 0) {
      this.results = this.results.filter(
        (result) => result.dataset_index !== index
      );
      // Update indices for remaining results
      this.results = this.results.map((result) => ({
        ...result,
        dataset_index:
          result.dataset_index > index
            ? result.dataset_index - 1
            : result.dataset_index,
      }));
    }
  }

  clearAll() {
    this.datasets = [];
    this.results = [];
    this.error = "";
    this.addDataset(); // Add one empty dataset
  }

  validateDataset(dataset: DatasetInput) {
    // Parse numbers from input
    dataset.parsedNumbers = dataset.numbersInput
      .split(",")
      .map((n) => parseFloat(n.trim()))
      .filter((n) => !isNaN(n) && isFinite(n));

    // Validate dataset
    dataset.isValid =
      dataset.parsedNumbers.length >= 10 &&
      dataset.confidenceLevel >= 80 &&
      dataset.confidenceLevel <= 99.99 &&
      dataset.name.trim().length > 0;
  }

  hasValidDatasets(): boolean {
    return this.datasets.length > 0 && this.datasets.some((d) => d.isValid);
  }

  getValidDatasetsCount(): number {
    return this.datasets.filter((d) => d.isValid).length;
  }

  getDatasetName(index: number): string {
    return this.datasets[index]?.name || `Dataset ${index + 1}`;
  }

  getSuccessfulResults(): number {
    return this.results.filter((r) => r.status === "success").length;
  }

  getFailedResults(): number {
    return this.results.filter((r) => r.status === "failed").length;
  }

  calculateBatchVaR() {
    this.error = "";
    this.results = [];
    this.loading = true;

    const validDatasets = this.datasets.filter((d) => d.isValid);

    if (validDatasets.length === 0) {
      this.error =
        "No valid datasets to calculate. Please ensure each dataset has at least 10 data points and a valid confidence level.";
      this.loading = false;
      return;
    }

    const requests: VaRRequest[] = validDatasets.map((dataset) => ({
      numbers: dataset.parsedNumbers,
      confidence_level: dataset.confidenceLevel,
      method: dataset.method,
    }));

    this.varApiService
      .batchCalculateVaR(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.results = response.batch_results;
          this.loading = false;

          // Show success message if all calculations succeeded
          const successCount = this.getSuccessfulResults();
          const totalCount = this.results.length;

          if (successCount === totalCount) {
            // All calculations successful
            console.log(
              `Successfully calculated VaR for all ${totalCount} datasets`
            );
          } else {
            // Some calculations failed
            console.warn(
              `${successCount}/${totalCount} calculations succeeded`
            );
          }
        },
        error: (err) => {
          this.error =
            err.message ||
            "An unexpected error occurred during batch calculation.";
          this.loading = false;
          console.error("Batch VaR calculation error:", err);
        },
      });
  }
}
