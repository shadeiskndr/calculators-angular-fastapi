import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert "Financial Risk Calculators API" in response.json()["message"]

def test_health_check():
    """Test health check endpoint"""
    response = client.get("/api/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_simple_var_calculation():
    """Test VaR calculation with valid data"""
    test_data = {
        "numbers": [1.2, -0.5, 2.1, -1.8, 0.7, -0.3, 1.5, -2.1, 0.9, -0.8],
        "confidence_level": 95.0,
        "method": "historical"
    }
    response = client.post("/api/simpleVaR", json=test_data)
    assert response.status_code == 200
    result = response.json()
    assert "var" in result
    assert result["confidence_level"] == "95.0%"
    assert result["method"] == "historical"
    assert result["sample_size"] == 10

def test_simple_var_validation_error():
    """Test VaR calculation with invalid data"""
    test_data = {
        "numbers": [1.0, 2.0],  # Too few numbers
        "confidence_level": 95.0,
        "method": "historical"
    }
    response = client.post("/api/simpleVaR", json=test_data)
    assert response.status_code == 422

def test_parametric_var():
    """Test parametric VaR calculation"""
    test_data = {
        "numbers": [0.1, -0.2, 0.15, -0.1, 0.05, -0.08, 0.12, -0.15, 0.09, -0.11],
        "confidence_level": 99.0,
        "method": "parametric"
    }
    response = client.post("/api/simpleVaR", json=test_data)
    assert response.status_code == 200
    result = response.json()
    assert result["method"] == "parametric"
    assert result["confidence_level"] == "99.0%"

def test_batch_var_calculation():
    """Test batch VaR calculation"""
    test_data = [
        {
            "numbers": [1.2, -0.5, 2.1, -1.8, 0.7, -0.3, 1.5, -2.1, 0.9, -0.8],
            "confidence_level": 95.0,
            "method": "historical"
        },
        {
            "numbers": [0.1, -0.2, 0.15, -0.1, 0.05, -0.08, 0.12, -0.15, 0.09, -0.11],
            "confidence_level": 95.0,
            "method": "parametric"
        }
    ]
    response = client.post("/api/batchVaR", json=test_data)
    assert response.status_code == 200
    result = response.json()
    assert "batch_results" in result
    assert len(result["batch_results"]) == 2
