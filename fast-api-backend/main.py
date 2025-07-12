from fastapi import FastAPI, HTTPException, status, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator, root_validator
from typing import List, Dict, Optional
import numpy as np
import logging
from enum import Enum

# ---------------------------------------------------------------------------
# FastAPI boiler-plate
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Financial Risk Calculators API",
    description="API for calculating financial risk metrics including Value-at-Risk (VaR)",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api", tags=["API"])


# ---------------------------------------------------------------------------
# ENUMS
# ---------------------------------------------------------------------------
class VaRMethod(str, Enum):
    HISTORICAL = "historical"
    PARAMETRIC = "parametric"
    MONTE_CARLO = "monte_carlo"


# ---------------------------------------------------------------------------
# ───────────────────────────── SIMPLE (1-D) MODELS ─────────────────────────
# ---------------------------------------------------------------------------
class Numbers(BaseModel):
    numbers: List[float] = Field(..., min_items=10, max_items=10_000)
    confidence_level: float = Field(95.0, ge=80.0, le=99.99)
    method: VaRMethod = VaRMethod.HISTORICAL

    @validator("numbers", each_item=True)
    def finite(cls, v):
        if not np.isfinite(v):
            raise ValueError("All numbers must be finite (no NaN/Inf)")
        if abs(v) > 1e10:
            raise ValueError("Numbers exceed reasonable bounds")
        return v

    @root_validator(skip_on_failure=True)
    def not_all_identical(cls, values):
        nums = values.get("numbers", [])
        if len(nums) and len(set(nums)) == 1:
            raise ValueError("All values are identical – cannot compute VaR")
        # outlier warning (same as original file)
        if len(nums):
            arr = np.asarray(nums)
            q75, q25 = np.percentile(arr, [75, 25])
            iqr = q75 - q25
            if iqr > 0:
                thr = 3 * iqr
                outliers = np.sum((arr < q25 - thr) | (arr > q75 + thr))
                if outliers > 0.1 * len(nums):
                    logger.warning(
                        f"Dataset contains {outliers} potential outliers "
                        f"({outliers / len(nums) * 100:.1f}%)"
                    )
        return values


class VaRResponse(BaseModel):
    var: float
    confidence_level: str
    method: str
    sample_size: int
    additional_stats: Optional[dict] = None


class ErrorResponse(BaseModel):
    error: str
    detail: str
    timestamp: str


# ---------------------------------------------------------------------------
# ────────────────────── PORTFOLIO (MULTI-FACTOR) MODELS ────────────────────
# ---------------------------------------------------------------------------
class RiskFactor(BaseModel):
    name: str
    historical_returns: List[float] = Field(..., min_items=10)

    @validator("historical_returns", each_item=True)
    def finite(cls, v):
        if not np.isfinite(v):
            raise ValueError("Risk-factor returns must be finite")
        return v


class Position(BaseModel):
    id: str
    current_value: float = Field(..., gt=0)
    sensitivities: Dict[str, float]  # key = risk-factor name


class PortfolioVaRRequest(BaseModel):
    positions: List[Position] = Field(..., min_items=1)
    risk_factors: List[RiskFactor] = Field(..., min_items=1)
    method: VaRMethod = VaRMethod.MONTE_CARLO
    confidence_level: float = Field(95.0, ge=80.0, le=99.99)
    simulations: int = Field(10_000, ge=100, le=1_000_000)

    @validator("positions", each_item=True)
    def check_sensitivities(cls, pos, values):
        factor_names = {rf.name for rf in values.get("risk_factors", [])}
        missing = factor_names - pos.sensitivities.keys()
        if missing:
            raise ValueError(f"Position '{pos.id}' missing sensitivities for {missing}")
        return pos

    @root_validator(skip_on_failure=True)
    def equal_history_length(cls, values):
        lengths = {len(rf.historical_returns) for rf in values["risk_factors"]}
        if len(lengths) > 1:
            raise ValueError(
                "All risk factors must have the same number of observations"
            )
        return values


# ---------------------------------------------------------------------------
# ──────────────────────────── HELPERS (1-D) ────────────────────────────────
# ---------------------------------------------------------------------------
def calculate_skewness(data: np.ndarray) -> float:
    n = len(data)
    mean = np.mean(data)
    std = np.std(data, ddof=1)
    if std == 0:
        return 0.0
    return np.sum(((data - mean) / std) ** 3) * n / ((n - 1) * (n - 2))


def calculate_kurtosis(data: np.ndarray) -> float:
    n = len(data)
    mean = np.mean(data)
    std = np.std(data, ddof=1)
    if std == 0:
        return 0.0
    kurt = (
        np.sum(((data - mean) / std) ** 4) * n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))
    )
    excess = kurt - 3 * (n - 1) ** 2 / ((n - 2) * (n - 3))
    return excess


def historical_var_1d(returns: np.ndarray, cl: float):
    # Convert to P/L (loss > 0, gain < 0)
    pnl = -returns
    var = np.percentile(pnl, cl)  # e.g. 95-th percentile of losses
    stats = dict(
        mean=float(np.mean(pnl)),
        std=float(np.std(pnl)),
        skewness=float(calculate_skewness(pnl)),
        kurtosis=float(calculate_kurtosis(pnl)),
        min=float(np.min(pnl)),
        max=float(np.max(pnl)),
    )
    return var, stats


def parametric_var_1d(returns: np.ndarray, cl: float):
    from scipy.stats import norm

    # mean / std of returns
    mean_ret = np.mean(returns)
    std_ret = np.std(returns, ddof=1)

    alpha = (100 - cl) / 100  # lower tail
    z = norm.ppf(alpha)  # negative

    var = -(mean_ret + z * std_ret)  # positive number in money-loss terms

    pnl = -returns  # ↔ risk-management convention for stats
    stats = dict(
        mean=float(np.mean(pnl)),
        std=float(np.std(pnl)),
        z_score=float(z),
        distribution="normal",
    )
    return var, stats


def monte_carlo_var_1d(returns: np.ndarray, cl: float, sims: int = 10_000):
    mean_ret = np.mean(returns)
    std_ret = np.std(returns, ddof=1)
    if std_ret == 0:
        raise ValueError("Std=0 – cannot simulate")

    sims_ret = np.random.normal(mean_ret, std_ret, size=sims)  # return scenarios
    pnl = -sims_ret  # convert to P/L

    var = np.percentile(pnl, cl)  # positive VaR (= loss at CL)

    stats = dict(
        mean=float(np.mean(pnl)),
        std=float(np.std(pnl)),
        simulations=sims,
        min_simulated=float(pnl.min()),
        max_simulated=float(pnl.max()),
    )
    return var, stats


# ---------------------------------------------------------------------------
# ───────────────────────── HELPERS (PORTFOLIO) ─────────────────────────────
# ---------------------------------------------------------------------------
def _delta_vector(positions: List[Position], factors: List[str]) -> np.ndarray:
    delta = np.zeros(len(factors))
    for pos in positions:
        for idx, f in enumerate(factors):
            delta[idx] += pos.sensitivities[f]
    return delta


def _returns_matrix(risk_factors: List[RiskFactor]) -> np.ndarray:
    # shape (time, factors)
    return np.column_stack([rf.historical_returns for rf in risk_factors])


def _cov_matrix(returns: np.ndarray) -> np.ndarray:
    return np.cov(returns.T, ddof=1)


def portfolio_var_historical(req: PortfolioVaRRequest):
    mat = _returns_matrix(req.risk_factors)
    delta = _delta_vector(req.positions, [rf.name for rf in req.risk_factors])
    pnl = -(mat @ delta)  # loss distribution

    # use the 95-th percentile on losses, not the 5-th
    pct = req.confidence_level  # 95
    var_value = np.percentile(pnl, pct)  # already positive
    stats = dict(
        mean=float(np.mean(pnl)),
        std=float(np.std(pnl)),
        skewness=float(calculate_skewness(pnl)),
        kurtosis=float(calculate_kurtosis(pnl)),
        min=float(np.min(pnl)),
        max=float(np.max(pnl)),
    )
    return var_value, stats


def portfolio_var_parametric(req: PortfolioVaRRequest):
    from scipy.stats import norm

    delta = _delta_vector(req.positions, [rf.name for rf in req.risk_factors])
    cov = _cov_matrix(_returns_matrix(req.risk_factors))
    var_variance = delta.T @ cov @ delta
    alpha = (100 - req.confidence_level) / 100
    z = norm.ppf(alpha)
    var = -z * np.sqrt(var_variance)
    stats = dict(z_score=float(z), variance=float(var_variance))
    return var, stats


def portfolio_var_monte_carlo(req: PortfolioVaRRequest):
    delta = _delta_vector(req.positions, [rf.name for rf in req.risk_factors])
    cov = _cov_matrix(_returns_matrix(req.risk_factors))
    shocks = np.random.multivariate_normal(
        mean=np.zeros(len(delta)), cov=cov, size=req.simulations
    )
    pnl = -(shocks @ delta)
    pct = req.confidence_level
    var = np.percentile(pnl, pct)
    stats = dict(
        simulations=req.simulations,
        min_sim=float(pnl.min()),
        max_sim=float(pnl.max()),
    )
    return var, stats


def dispatch_portfolio_var(req: PortfolioVaRRequest):
    if req.method == VaRMethod.HISTORICAL:
        return portfolio_var_historical(req)
    if req.method == VaRMethod.PARAMETRIC:
        return portfolio_var_parametric(req)
    if req.method == VaRMethod.MONTE_CARLO:
        return portfolio_var_monte_carlo(req)
    raise ValueError(f"Unknown method {req.method}")


# ---------------------------------------------------------------------------
# ───────────────────────────── EXCEPTION HANDLERS ──────────────────────────
# ---------------------------------------------------------------------------
@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    logger.error(f"Validation error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": "Validation Error", "detail": str(exc)},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unexpected error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": "An unexpected error occurred",
        },
    )


# ---------------------------------------------------------------------------
# ─────────────────────────────── ENDPOINTS ────────────────────────────────
# ---------------------------------------------------------------------------
@api_router.get("/healthz", tags=["Health"])
def health():
    return {"status": "ok", "service": "Financial Risk Calculators API"}


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Financial Risk Calculators API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/healthz",
        "api_endpoints": "/api",
    }


# ----------------------------- simpleVaR -----------------------------------
@api_router.post("/simpleVaR", response_model=VaRResponse, tags=["Risk Calculations"])
def simple_var(data: Numbers):
    ret = np.asarray(data.numbers)
    cl = float(data.confidence_level)

    if data.method == VaRMethod.HISTORICAL:
        var, stats = historical_var_1d(ret, cl)
    elif data.method == VaRMethod.PARAMETRIC:
        var, stats = parametric_var_1d(ret, cl)
    elif data.method == VaRMethod.MONTE_CARLO:
        var, stats = monte_carlo_var_1d(ret, cl)
    else:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"Method '{data.method}' not implemented",
        )

    return VaRResponse(
        var=round(float(var), 6),
        confidence_level=f"{cl}%",
        method=data.method,
        sample_size=len(ret),
        additional_stats=stats,
    )


# ----------------------------- batchVaR ------------------------------------
@api_router.post("/batchVaR", tags=["Risk Calculations"])
def batch_var(datasets: List[Numbers]):
    if len(datasets) > 10:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Maximum 10 datasets allowed per batch request",
        )
    results = []
    for idx, ds in enumerate(datasets):
        try:
            res = simple_var(ds)
            results.append({"dataset_index": idx, "result": res, "status": "success"})
        except Exception as e:
            results.append({"dataset_index": idx, "error": str(e), "status": "failed"})
    return {"batch_results": results}


# -------------------------- NEW portfolioVaR -------------------------------
@api_router.post(
    "/portfolioVaR",
    response_model=VaRResponse,
    tags=["Risk Calculations"],
    summary="Multi-factor portfolio VaR",
)
def portfolio_var(req: PortfolioVaRRequest):
    try:
        logger.info(
            f"Portfolio VaR – method={req.method} "
            f"CL={req.confidence_level}% sims={req.simulations}"
        )
        var, stats = dispatch_portfolio_var(req)
        return VaRResponse(
            var=round(float(var), 6),
            confidence_level=f"{req.confidence_level}%",
            method=req.method,
            sample_size=len(req.risk_factors),
            additional_stats=stats,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        )
    except Exception as e:
        logger.exception("Unexpected portfolio VaR error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during portfolio VaR calculation",
        )


# ---------------------------------------------------------------------------
# include router
# ---------------------------------------------------------------------------
app.include_router(api_router)
