#!/bin/bash

set -e  # Exit on any error

echo "🚀 Starting containers..."
docker compose up -d --build

echo "⏳ Waiting for API to be ready..."
sleep 15

# ---------------------------------------------------------------------
# 1. /api/healthz
# ---------------------------------------------------------------------
echo "🔍 Testing /api/healthz endpoint..."
if curl -f http://localhost:8080/api/healthz; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    docker compose logs calculators-api
    docker compose down
    exit 1
fi

# ---------------------------------------------------------------------
# 2. /api/simpleVaR
# ---------------------------------------------------------------------
echo "🧮 Testing /api/simpleVaR endpoint..."
response=$(curl -s -X POST http://localhost:8080/api/simpleVaR \
  -H "Content-Type: application/json" \
  -d '{"numbers": [
        0.01, 0.02, -0.015, 0.005, 0.03, -0.01,
        0.025, -0.02, 0.015, 0.01, -0.005, 0.02,
        0.03, -0.015, 0.005, 0.01, 0.02, -0.01,
        0.015, 0.025, -0.02, 0.01, 0.005, 0.03,
        -0.015, -0.005, 0.02, 0.01, -0.01, 0.015
        ]
      }')

if echo "$response" | grep -q "\"var\""; then
    echo "✅ VaR calculation test passed"
    echo "📊 Response: $response"
else
    echo "❌ VaR calculation test failed"
    echo "Response: $response"
    docker compose logs calculators-api
    docker compose down
    exit 1
fi

# ---------------------------------------------------------------------
# 3. /api/simpleVaR error handling
# ---------------------------------------------------------------------
echo "🧪 Testing error handling..."
error_response=$(curl -s -X POST http://localhost:8080/api/simpleVaR \
  -H "Content-Type: application/json" \
  -d '{"numbers": []}')

if echo "$error_response" | grep -q "\"detail\""; then
    echo "✅ Error handling test passed"
else
    echo "❌ Error handling test failed"
    echo "Response: $error_response"
fi

# ---------------------------------------------------------------------
# 4. NEW  /api/portfolioVaR
# ---------------------------------------------------------------------
echo "🏦 Testing /api/portfolioVaR endpoint..."
portfolio_response=$(curl -s -X POST http://localhost:8080/api/portfolioVaR \
  -H "Content-Type: application/json" \
  -d '{
        "positions": [
          {
            "id": "pos1",
            "current_value": 1000000,
            "sensitivities": { "factor1": 1.0 }
          }
        ],
        "risk_factors": [
          {
            "name": "factor1",
            "historical_returns": [
              0.01, 0.02, -0.015, 0.005, 0.03, -0.01,
              0.025, -0.02, 0.015, 0.01, -0.005, 0.02,
              0.03, -0.015, 0.005, 0.01, 0.02, -0.01,
              0.015, 0.025, -0.02, 0.01, 0.005, 0.03,
              -0.015, -0.005, 0.02, 0.01, -0.01, 0.015
            ]
          }
        ],
        "method": "historical",
        "confidence_level": 95.0,
        "simulations": 10000
      }')

if echo "$portfolio_response" | grep -q "\"var\""; then
    echo "✅ Portfolio VaR test passed"
    echo "📊 Response: $portfolio_response"
else
    echo "❌ Portfolio VaR test failed"
    echo "Response: $portfolio_response"
    docker compose logs calculators-api
    docker compose down
    exit 1
fi

echo "✅ All tests passed!"

echo "🧹 Tearing down containers..."
docker compose down

echo "🎉 Test complete!"
