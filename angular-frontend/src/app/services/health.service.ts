import { Injectable, signal, computed, effect } from "@angular/core";
import { interval, switchMap, catchError, of, Observable } from "rxjs";
import { VarApiService } from "./var-api.service";

export interface HealthStatus {
  isHealthy: boolean;
  lastChecked: Date;
  error?: string;
  consecutiveFailures: number;
}

@Injectable({
  providedIn: "root",
})
export class HealthService {
  // Signal-based health state
  private healthState = signal<HealthStatus>({
    isHealthy: false,
    lastChecked: new Date(),
    consecutiveFailures: 0,
  });

  // Computed signals for derived state
  readonly isHealthy = computed(() => this.healthState().isHealthy);
  readonly lastChecked = computed(() => this.healthState().lastChecked);
  readonly error = computed(() => this.healthState().error);
  readonly consecutiveFailures = computed(
    () => this.healthState().consecutiveFailures
  );

  // Health status with severity levels
  readonly healthSeverity = computed(() => {
    const failures = this.consecutiveFailures();
    if (this.isHealthy()) return "success";
    if (failures < 3) return "warning";
    return "error";
  });

  readonly healthMessage = computed(() => {
    if (this.isHealthy()) return "API is healthy";
    const failures = this.consecutiveFailures();
    return `API unhealthy (${failures} consecutive failures)`;
  });

  constructor(private varApiService: VarApiService) {
    this.startHealthCheck();

    // Effect to log health status changes
    effect(() => {
      const status = this.healthState();
      console.log("Health Status:", {
        healthy: status.isHealthy,
        lastChecked: status.lastChecked,
        failures: status.consecutiveFailures,
      });
    });
  }

  private startHealthCheck() {
    // Check health every 30 seconds
    interval(30000)
      .pipe(
        switchMap(() =>
          this.varApiService
            .healthCheck()
            .pipe(catchError((error) => of({ error: error.message })))
        )
      )
      .subscribe({
        next: (response) => {
          if ("error" in response) {
            this.updateHealthStatus(false, response.error);
          } else {
            this.updateHealthStatus(true);
          }
        },
      });

    // Initial health check
    this.performHealthCheck();
  }

  private performHealthCheck(): Observable<{
    success: boolean;
    error?: string;
  }> {
    return new Observable((observer) => {
      this.varApiService
        .healthCheck()
        .pipe(catchError((error) => of({ error: error.message })))
        .subscribe({
          next: (response) => {
            if ("error" in response) {
              this.updateHealthStatus(false, response.error);
              observer.next({ success: false, error: response.error });
            } else {
              this.updateHealthStatus(true);
              observer.next({ success: true });
            }
            observer.complete();
          },
          error: (error) => {
            observer.next({ success: false, error: error.message });
            observer.complete();
          },
        });
    });
  }

  private updateHealthStatus(isHealthy: boolean, error?: string) {
    this.healthState.update((current) => ({
      isHealthy,
      lastChecked: new Date(),
      error: isHealthy ? undefined : error,
      consecutiveFailures: isHealthy ? 0 : current.consecutiveFailures + 1,
    }));
  }

  // Manual health check trigger that returns observable for component to handle
  checkHealth(): Observable<{ success: boolean; error?: string }> {
    return this.performHealthCheck();
  }

  // Get full health status as signal
  getHealthStatus() {
    return this.healthState.asReadonly();
  }
}
