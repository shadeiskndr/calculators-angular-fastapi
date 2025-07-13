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
  result: VaRResponse;
  error: string;
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

export interface Position {
  id: string;
  current_value: number;
  sensitivities: { [riskFactor: string]: number };
}

export interface RiskFactor {
  name: string;
  historical_returns: number[];
}

export interface AdditionalStats {
  mean?: number;
  std?: number;
  skewness?: number;
  kurtosis?: number;
  min?: number;
  max?: number;
  z_score?: number;
  distribution?: string;
  simulations?: number;
  min_simulated?: number;
  max_simulated?: number;
  variance?: number;
  min_sim?: number;
  total_portfolio_value?: number;
  positions_count?: number;
  risk_factors_count?: number;
  expected_return?: number;
  volatility?: number;
  diversification_ratio?: number;
}

export interface PortfolioVaRRequest {
  positions: Position[];
  risk_factors: RiskFactor[];
  method: "historical" | "parametric" | "monte_carlo";
  confidence_level: number;
  simulations?: number;
}

export interface PortfolioVaRResponse {
  var: number;
  confidence_level: string;
  method: string;
  sample_size: number;
  total_portfolio_value?: number;
  positions_count?: number;
  risk_factors_count?: number;
  simulations?: number;
  additional_stats?: AdditionalStats;
}
