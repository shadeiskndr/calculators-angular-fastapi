from fastapi import FastAPI, HTTPException, status, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator, root_validator
from typing import List, Optional
import numpy as np
import logging
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Financial Risk Calculators API",
    description="API for calculating financial risk metrics including Value at Risk (VaR)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware with more restrictive settings for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Create API router
api_router = APIRouter(prefix="/api", tags=["API"])


# VaRMethod Enum for calculation method
class VaRMethod(str, Enum):
    HISTORICAL = "historical"
    PARAMETRIC = "parametric"
    MONTE_CARLO = "monte_carlo"


# Enhanced Pydantic models with validation
class Numbers(BaseModel):
    numbers: List[float] = Field(
        ...,
        min_items=10,  # Minimum sample size for statistical significance
        max_items=10000,  # Prevent memory issues
        description="Array of numerical values (returns, prices, etc.)",
    )
    confidence_level: float = Field(
        default=95.0,
        ge=80.0,
        le=99.99,
        description="Confidence level for VaR calculation (as a percentage, e.g., 95.0)",
    )
    method: VaRMethod = Field(
        default=VaRMethod.HISTORICAL, description="Method to use for VaR calculation"
    )

    @validator("numbers", each_item=True)
    def validate_numbers(cls, v):
        if not np.isfinite(v):
            raise ValueError("All numbers must be finite (no NaN or infinity values)")
        if abs(v) > 1e10:  # Reasonable bounds
            raise ValueError("Numbers must be within reasonable bounds")
        return v

    @root_validator(skip_on_failure=True)
    def validate_data_quality(cls, values):
        numbers = values.get("numbers", [])
        if len(numbers) > 0:
            # Check for data quality issues
            if len(set(numbers)) == 1:
                raise ValueError(
                    "All values are identical - cannot calculate meaningful VaR"
                )

            # Check for extreme outliers (basic check)
            arr = np.array(numbers)
            q75, q25 = np.percentile(arr, [75, 25])
            iqr = q75 - q25
            if iqr > 0:
                outlier_threshold = 3 * iqr
                outliers = np.sum(
                    (arr < (q25 - outlier_threshold))
                    | (arr > (q75 + outlier_threshold))
                )
                if outliers > len(numbers) * 0.1:  # More than 10% outliers
                    logger.warning(
                        f"Dataset contains {outliers} potential outliers ({outliers/len(numbers)*100:.1f}%)"
                    )

        return values


class VaRResponse(BaseModel):
    var: float = Field(..., description="Value at Risk")
    confidence_level: str = Field(..., description="Confidence level used")
    method: str = Field(..., description="Calculation method used")
    sample_size: int = Field(..., description="Number of data points used")
    additional_stats: Optional[dict] = Field(
        None, description="Additional statistical information"
    )


class ErrorResponse(BaseModel):
    error: str
    detail: str
    timestamp: str


# Custom exception handler
@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    logger.error(f"Validation error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": "Validation Error", "detail": str(exc)},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unexpected error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": "An unexpected error occurred",
        },
    )


# Enhanced calculation functions
def calculate_historical_var(returns: np.ndarray, confidence_level: float) -> tuple:
    """Calculate VaR using historical simulation method"""
    try:
        percentile = 100 - confidence_level
        var_value = np.percentile(returns, percentile)

        # Additional statistics
        stats = {
            "mean": float(np.mean(returns)),
            "std": float(np.std(returns)),
            "skewness": float(calculate_skewness(returns)),
            "kurtosis": float(calculate_kurtosis(returns)),
            "min": float(np.min(returns)),
            "max": float(np.max(returns)),
        }

        return -var_value, stats  # VaR is typically expressed as positive loss
    except Exception as e:
        logger.error(f"Error in historical VaR calculation: {str(e)}")
        raise ValueError(f"Failed to calculate historical VaR: {str(e)}")


def calculate_parametric_var(returns: np.ndarray, confidence_level: float) -> tuple:
    """Calculate VaR using parametric (normal distribution) method"""
    try:
        from scipy import stats

        mean = np.mean(returns)
        std = np.std(returns, ddof=1)  # Sample standard deviation

        # Z-score for given confidence level
        alpha = (100 - confidence_level) / 100
        z_score = stats.norm.ppf(alpha)

        var_value = -(mean + z_score * std)

        stats_dict = {
            "mean": float(mean),
            "std": float(std),
            "z_score": float(z_score),
            "distribution": "normal",
        }

        return var_value, stats_dict
    except Exception as e:
        logger.error(f"Error in parametric VaR calculation: {str(e)}")
        raise ValueError(f"Failed to calculate parametric VaR: {str(e)}")


def calculate_skewness(data: np.ndarray) -> float:
    """Calculate skewness of the data"""
    n = len(data)
    mean = np.mean(data)
    std = np.std(data, ddof=1)

    if std == 0:
        return 0.0

    skew = np.sum(((data - mean) / std) ** 3) * n / ((n - 1) * (n - 2))
    return skew


def calculate_kurtosis(data: np.ndarray) -> float:
    """Calculate excess kurtosis of the data"""
    n = len(data)
    mean = np.mean(data)
    std = np.std(data, ddof=1)

    if std == 0:
        return 0.0

    kurt = (
        np.sum(((data - mean) / std) ** 4) * n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))
    )
    excess_kurt = kurt - 3 * (n - 1) ** 2 / ((n - 2) * (n - 3))
    return excess_kurt


@api_router.get("/healthz", tags=["Health"])
def health():
    """Health check endpoint"""
    return {"status": "ok", "service": "Financial Risk Calculators API"}


@app.get("/", tags=["Root"])
def root():
    """Root endpoint with API information"""
    return {
        "message": "Financial Risk Calculators API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/healthz",
        "api_endpoints": "/api",
    }


@api_router.post("/simpleVaR", response_model=VaRResponse, tags=["Risk Calculations"])
def calculate_var(data: Numbers):
    """
    Calculate Value at Risk (VaR) using various methods

    - **numbers**: Array of numerical values (minimum 10 values required)
    - **confidence_level**: Confidence level (as a percentage, e.g., 95.0)
    - **method**: Calculation method (historical, parametric, or monte_carlo)
    """
    try:
        logger.info(
            f"Calculating VaR with {len(data.numbers)} data points, "
            f"confidence level: {data.confidence_level}%, method: {data.method}"
        )

        returns = np.array(data.numbers)
        confidence = float(data.confidence_level)

        # Route to appropriate calculation method
        if data.method == VaRMethod.HISTORICAL:
            var_value, stats = calculate_historical_var(returns, confidence)
        elif data.method == VaRMethod.PARAMETRIC:
            var_value, stats = calculate_parametric_var(returns, confidence)
        else:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail=f"Method '{data.method}' is not yet implemented",
            )

        # Validate result
        if not np.isfinite(var_value):
            raise ValueError("VaR calculation resulted in invalid value")

        response = VaRResponse(
            var=round(var_value, 6),
            confidence_level=f"{data.confidence_level}%",
            method=data.method,
            sample_size=len(data.numbers),
            additional_stats=stats,
        )

        logger.info(f"VaR calculation successful: {var_value:.6f}")
        return response

    except ValueError as e:
        logger.error(f"Validation error in VaR calculation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error in VaR calculation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during VaR calculation",
        )


@api_router.post("/batchVaR", tags=["Risk Calculations"])
def batch_var_calculation(datasets: List[Numbers]):
    """Calculate VaR for multiple datasets"""
    if len(datasets) > 10:  # Limit batch size
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Maximum 10 datasets allowed per batch request",
        )

    results = []
    for i, dataset in enumerate(datasets):
        try:
            result = calculate_var(dataset)
            results.append({"dataset_index": i, "result": result, "status": "success"})
        except Exception as e:
            results.append({"dataset_index": i, "error": str(e), "status": "failed"})

    return {"batch_results": results}


# Include the API router
app.include_router(api_router)
