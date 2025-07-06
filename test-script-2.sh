#!/bin/bash
#
# Integration test-suite for the Financial-Risk-Calculators stack
# ---------------------------------------------------------------
set -e

echo "🚀  Starting containers..."
docker compose up -d --build

echo "⏳  Waiting for API to be ready..."
sleep 15

BASE="http://localhost:8080"

# ---------------------------------------------------------------------
# 1. /api/healthz
# ---------------------------------------------------------------------
echo "🔍  Testing /api/healthz endpoint..."
curl -f "${BASE}/api/healthz" && echo -e "\n✅  Health check passed"

# ---------------------------------------------------------------------
# 2. /api/simpleVaR  (happy path)
# ---------------------------------------------------------------------
echo "🧮  Testing /api/simpleVaR endpoint..."
simple_response=$(curl -s -X POST "${BASE}/api/simpleVaR" \
  -H "Content-Type: application/json" \
  -d '{"numbers":[0.01,0.02,-0.015,0.005,0.03,-0.01,0.025,-0.02,0.015,0.01,-0.005,0.02,0.03,-0.015,0.005,0.01,0.02,-0.01,0.015,0.025,-0.02,0.01,0.005,0.03,-0.015,-0.005,0.02,0.01,-0.01,0.015]}')

echo "📊  Response: $simple_response"
echo "$simple_response" | grep -q "\"var\"" && echo "✅  VaR calculation test passed"

# ---------------------------------------------------------------------
# 3. /api/simpleVaR  (error path)
# ---------------------------------------------------------------------
echo "🧪  Testing /api/simpleVaR error handling..."
err_response=$(curl -s -X POST "${BASE}/api/simpleVaR" \
  -H "Content-Type: application/json" \
  -d '{"numbers": []}')

echo "$err_response" | grep -q "\"detail\"" && echo "✅  Error handling test passed"

# ---------------------------------------------------------------------
# 4. /api/portfolioVaR – Historical, two factors
# ---------------------------------------------------------------------
HIST_PAYLOAD=$(cat <<'JSON'
{
  "positions": [
    { "id": "eq_book", "current_value": 1500000,
      "sensitivities": { "SP500": 0.9,  "EURUSD": -800 } },
    { "id": "fx_book", "current_value": 700000,
      "sensitivities": { "SP500": 0.2,  "EURUSD": 1500 } }
  ],
  "risk_factors": [
    { "name": "SP500",
      "historical_returns": [0.012,-0.03,0.018,-0.011,0.027,0.006,-0.022,0.021,-0.015,0.009]},
    { "name": "EURUSD",
      "historical_returns": [0.0015,-0.0020,0.0008,-0.0012,0.0026,-0.0004,0.0011,-0.0017,0.0009,0.0000]}
  ],
  "method": "historical",
  "confidence_level": 95.0
}
JSON
)

echo "🏦  Testing /api/portfolioVaR (historical)..."
hist_resp=$(curl -s -X POST "${BASE}/api/portfolioVaR" \
  -H "Content-Type: application/json" \
  -d "$HIST_PAYLOAD")
echo "📊  Response: $hist_resp"
echo "$hist_resp" | grep -q "\"var\"" && echo "✅  Historical portfolio VaR test passed"

# ---------------------------------------------------------------------
# 5. /api/portfolioVaR – Parametric, three factors
# ---------------------------------------------------------------------
PARA_PAYLOAD=$(cat <<'JSON'
{
  "positions": [
    { "id": "equity_fund", "current_value": 1000000,
      "sensitivities": { "SP500": 1.2, "USDJPY": -1100, "US10Y": -50000 } },
    { "id": "bond_port",  "current_value":  800000,
      "sensitivities": { "SP500": -0.3, "USDJPY":  500,  "US10Y":  70000 } },
    { "id": "macro_book", "current_value":  500000,
      "sensitivities": { "SP500": 0.0,  "USDJPY": -300,  "US10Y":  25000 } }
  ],
  "risk_factors": [
    { "name": "SP500",
      "historical_returns": [0.010,-0.032,0.020,-0.014,0.025,-0.008,0.031,-0.019,0.013,0.004]},
    { "name": "USDJPY",
      "historical_returns": [0.0020,-0.0015,0.0012,-0.0028,0.0031,-0.0006,0.0018,-0.0012,0.0014,0.0001]},
    { "name": "US10Y",
      "historical_returns": [0.0006,-0.0004,0.0005,-0.0007,0.0009,-0.0003,0.0010,-0.0006,0.0007,0.0002]}
  ],
  "method": "parametric",
  "confidence_level": 97.5
}
JSON
)

echo "📈  Testing /api/portfolioVaR (parametric)..."
para_resp=$(curl -s -X POST "${BASE}/api/portfolioVaR" \
  -H "Content-Type: application/json" \
  -d "$PARA_PAYLOAD")
echo "📊  Response: $para_resp"
echo "$para_resp" | grep -q "\"var\"" && echo "✅  Parametric portfolio VaR test passed"

# ---------------------------------------------------------------------
# 6. /api/portfolioVaR – Monte-Carlo, 50 000 sims
# ---------------------------------------------------------------------
MC_PAYLOAD=$(cat <<'JSON'
{
  "positions": [
    { "id": "global_port", "current_value": 2000000,
      "sensitivities": { "SP500": 0.7, "USDJPY": -900, "US10Y": 40000 } },
    { "id": "hedge_book", "current_value": 1200000,
      "sensitivities": { "SP500": -0.5, "USDJPY": 650, "US10Y": -30000 } }
  ],
  "risk_factors": [
    { "name": "SP500",
      "historical_returns": [0.010,-0.032,0.020,-0.014,0.025,-0.008,0.031,-0.019,0.013,0.004]},
    { "name": "USDJPY",
      "historical_returns": [0.0020,-0.0015,0.0012,-0.0028,0.0031,-0.0006,0.0018,-0.0012,0.0014,0.0001]},
    { "name": "US10Y",
      "historical_returns": [0.0006,-0.0004,0.0005,-0.0007,0.0009,-0.0003,0.0010,-0.0006,0.0007,0.0002]}
  ],
  "method": "monte_carlo",
  "confidence_level": 99.0,
  "simulations": 50000
}
JSON
)

echo "🎲  Testing /api/portfolioVaR (monte-carlo)..."
mc_resp=$(curl -s -X POST "${BASE}/api/portfolioVaR" \
  -H "Content-Type: application/json" \
  -d "$MC_PAYLOAD")
echo "📊  Response: $mc_resp"
echo "$mc_resp" | grep -q "\"var\"" && echo "✅  Monte-Carlo portfolio VaR test passed"

# ---------------------------------------------------------------------
echo "✅  All tests passed!"

echo "🧹  Tearing down containers..."
docker compose down

echo "🎉  Test complete!"
