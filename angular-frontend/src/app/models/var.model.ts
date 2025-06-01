export enum VaRMethod {
  HISTORICAL = "historical",
  PARAMETRIC = "parametric",
  MONTE_CARLO = "monte_carlo",
}

export interface VaRRequest {
  numbers: number[];
  confidence_level: number;
  method: VaRMethod;
}

export interface AdditionalStats {
  mean: number;
  std: number;
  skewness?: number;
  kurtosis?: number;
  min: number;
  max: number;
  z_score?: number;
  distribution?: string;
}

export interface VaRResponse {
  var: number;
  confidence_level: string;
  method: string;
  sample_size: number;
  additional_stats?: AdditionalStats;
}

export interface BatchVaRRequest {
  datasets: VaRRequest[];
}

export interface BatchVaRResult {
  dataset_index: number;
  result?: VaRResponse;
  error?: string;
  status: "success" | "failed";
}

export interface BatchVaRResponse {
  batch_results: BatchVaRResult[];
}

export interface ApiError {
  error: string;
  detail: string;
  timestamp?: string;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
}

export interface ApiInfoResponse {
  message: string;
  version: string;
  docs: string;
  health: string;
}
