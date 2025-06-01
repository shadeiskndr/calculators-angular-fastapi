import { Component, computed, inject } from "@angular/core";
import { ButtonModule } from "primeng/button";
import { StyleClassModule } from "primeng/styleclass";
import { ToastModule } from "primeng/toast";
import { MessageService } from "primeng/api";
import { AppConfig } from "./app.config";
import { LayoutService } from "../services/layout.service";
import { HealthService } from "../services/health.service";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-topbar",
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    StyleClassModule,
    ToastModule,
    AppConfig,
  ],
  providers: [MessageService],
  template: `
    <div
      class="bg-surface-0 dark:bg-surface-900 p-6 rounded-2xl max-w-7xl mx-auto border border-surface-200 dark:border-surface-700 w-full"
    >
      <div class="flex justify-between items-center">
        <div class="flex gap-3 items-center">
          <img src="assets/logo.png" alt="Logo" class="w-8 h-8" />
          <span class="hidden sm:flex flex-col"
            ><span
              class="text-xl font-light text-surface-700 dark:text-surface-100 leading-none"
              >Shahathir's Calculators</span
            >
            <span class="text-sm font-medium text-primary leading-tight"
              >VaR Calculator</span
            ></span
          >
        </div>
        <div class="flex items-center gap-2">
          <!-- Health Status Indicator -->
          <div class="flex items-center">
            <div
              class="w-2 h-2 rounded-full animate-pulse mr-1.5"
              [ngClass]="{
                'bg-green-500': healthService.healthSeverity() === 'success',
                'bg-yellow-500': healthService.healthSeverity() === 'warning',
                'bg-red-500': healthService.healthSeverity() === 'error'
              }"
              [title]="getHealthTooltip()"
            ></div>
            <span
              class="text-xs mr-1 text-surface-600 dark:text-surface-400 hidden md:inline"
            >
              {{ healthService.healthMessage() }}
            </span>
            <p-button
              type="button"
              (click)="onHealthCheckClick()"
              [text]="true"
              [rounded]="true"
              icon="pi pi-refresh"
              styleClass="w-10 h-10"
              [title]="'Refresh health status'"
              aria-label="Refresh health status"
            />
          </div>

          <!-- Dark Mode Toggle -->
          <p-button
            type="button"
            (click)="toggleDarkMode()"
            [rounded]="true"
            [text]="true"
            styleClass="w-10 h-10"
            aria-label="Toggle dark mode"
          >
            <i
              class="pi text-base"
              [ngClass]="{
                'pi-moon': isDarkMode(),
                'pi-sun': !isDarkMode()
              }"
            ></i>
          </p-button>

          <!-- Color Scheme Picker -->
          <div class="relative">
            <p-button
              pStyleClass="@next"
              enterFromClass="hidden"
              enterActiveClass="animate-scalein"
              leaveToClass="hidden"
              leaveActiveClass="animate-fadeout"
              [hideOnOutsideClick]="true"
              icon="pi pi-palette"
              text
              rounded
              aria-label="Color Palette"
            />
            <app-config class="hidden" />
          </div>
        </div>
      </div>
    </div>

    <!-- Toast Container -->
    <p-toast position="top-right" />
  `,
})
export class AppTopbar {
  readonly layoutService = inject(LayoutService);
  readonly healthService = inject(HealthService);
  private readonly messageService = inject(MessageService);

  readonly isDarkMode = computed(() => this.layoutService.appState().darkMode);

  getHealthTooltip(): string {
    const status = this.healthService.getHealthStatus()();
    const lastChecked = status.lastChecked.toLocaleTimeString();

    if (status.isHealthy) {
      return `API Connected - Last checked: ${lastChecked}`;
    } else {
      return `API Disconnected - ${
        status.error || "Unknown error"
      } - Last checked: ${lastChecked}`;
    }
  }

  onHealthCheckClick(): void {
    // Show initial toast
    this.messageService.add({
      severity: "info",
      summary: "Health Check",
      detail: "Checking API health...",
      life: 2000,
    });

    // Perform health check and handle result
    this.healthService.checkHealth().subscribe({
      next: (result) => {
        if (result.success) {
          this.messageService.add({
            severity: "success",
            summary: "Health Check Success",
            detail: "API is healthy and responding",
            life: 3000,
          });
        } else {
          this.messageService.add({
            severity: "error",
            summary: "Health Check Failed",
            detail: `API is unreachable: ${result.error || "Unknown error"}`,
            life: 5000,
          });
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: "error",
          summary: "Health Check Error",
          detail: "Failed to perform health check",
          life: 5000,
        });
      },
    });
  }

  toggleDarkMode() {
    this.layoutService.appState.update((state) => ({
      ...state,
      darkMode: !state.darkMode,
    }));
  }
}
