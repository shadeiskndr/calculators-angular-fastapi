import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError, retry } from "rxjs/operators";
import {
  VaRRequest,
  VaRResponse,
  BatchVaRRequest,
  BatchVaRResponse,
  ApiError,
  HealthCheckResponse,
  ApiInfoResponse,
} from "../models/var.model";

@Injectable({
  providedIn: "root",
})
export class VarApiService {
  private readonly apiUrl = "/api";

  constructor(private http: HttpClient) {}

  calculateVaR(request: VaRRequest): Observable<VaRResponse> {
    return this.http
      .post<VaRResponse>(`${this.apiUrl}/simpleVaR`, request)
      .pipe(retry(1), catchError(this.handleError));
  }

  batchCalculateVaR(requests: VaRRequest[]): Observable<BatchVaRResponse> {
    return this.http
      .post<BatchVaRResponse>(`${this.apiUrl}/batchVaR`, requests)
      .pipe(retry(1), catchError(this.handleError));
  }

  healthCheck(): Observable<HealthCheckResponse> {
    return this.http
      .get<HealthCheckResponse>(`${this.apiUrl}/healthz`)
      .pipe(catchError(this.handleError));
  }

  getApiInfo(): Observable<ApiInfoResponse> {
    return this.http
      .get<ApiInfoResponse>(`${this.apiUrl}/`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = "An unknown error occurred";

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Network Error: ${error.error.message}`;
    } else {
      // Server-side error
      const apiError = error.error as ApiError;
      switch (error.status) {
        case 422:
          errorMessage = `Validation Error: ${
            apiError?.detail || "Invalid input data"
          }`;
          break;
        case 500:
          errorMessage = `Server Error: ${
            apiError?.detail || "Internal server error"
          }`;
          break;
        case 501:
          errorMessage = `Not Implemented: ${
            apiError?.detail || "Feature not available"
          }`;
          break;
        case 413:
          errorMessage = `Request Too Large: ${
            apiError?.detail || "Too much data"
          }`;
          break;
        case 0:
          errorMessage =
            "Connection failed: Please check if the API server is running";
          break;
        default:
          errorMessage = `Error ${error.status}: ${
            apiError?.detail || error.message
          }`;
      }
    }

    console.error("API Error:", error);
    return throwError(() => new Error(errorMessage));
  }
}
