#!/bin/bash

set -e  # Exit on any error

echo "🚀 Starting containers..."
docker-compose up -d --build

echo "⏳ Waiting for API to be ready..."
sleep 15

echo "🔍 Testing /healthz endpoint..."
if curl -f http://localhost:8080/healthz; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    docker-compose logs risk-api
    docker-compose down
    exit 1
fi

echo "🧮 Testing /simpleVaR endpoint..."
response=$(curl -s -X POST http://localhost:8080/simpleVaR \
  -H "Content-Type: application/json" \
  -d '{"numbers": [-2.5, -1.0, 0.5, 1.0, 2.0, 3.0, -3.0, -0.5]}')

if echo "$response" | grep -q "var"; then
    echo "✅ VaR calculation test passed"
    echo "📊 Response: $response"
else
    echo "❌ VaR calculation test failed"
    echo "Response: $response"
    docker-compose logs risk-api
    docker-compose down
    exit 1
fi

echo "🧪 Testing error handling..."
error_response=$(curl -s -X POST http://localhost:8080/simpleVaR \
  -H "Content-Type: application/json" \
  -d '{"numbers": []}')

if echo "$error_response" | grep -q "detail"; then
    echo "✅ Error handling test passed"
else
    echo "❌ Error handling test failed"
    echo "Response: $error_response"
fi

echo "✅ All tests passed!"

echo "🧹 Tearing down containers..."
docker-compose down

echo "🎉 Test complete!"
