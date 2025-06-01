# Calculators Project

## Overview

This project is a **full-stack web application** for financial risk calculations, specifically focused on Value at Risk (VaR) and related metrics.

---

## Architecture

### Project Structure

```
calculators-angular-fastapi/
├── angular-frontend/      # Angular SPA frontend
├── fast-api-backend/      # FastAPI Python backend
├── docker-compose.yml     # Orchestration for frontend & backend
├── test-script.sh         # For testing
└── .github/               # GitHub Actions CI config
```

---

### Backend: FastAPI (Python)

- **Location:** `fast-api-backend/`
- **Entrypoint:** `main.py`
- **Dockerized:** See `fast-api-backend/Dockerfile`
- **Requirements:** See `fast-api-backend/requirements.txt`

#### Features

- **API for Financial Risk Calculations:**
  - Main endpoint: `/simpleVaR` (POST) — calculates Value at Risk (VaR) using historical or parametric methods.
  - Batch endpoint: `/batchVaR` (POST) — calculates VaR for multiple datasets.
  - Health check: `/healthz`
  - Root info: `/`
- **Validation & Error Handling:**
  - Uses Pydantic models for input validation.
  - Handles outliers, identical values, and extreme values.
  - Custom error handlers for validation and server errors.
- **Statistical Calculations:**
  - Supports historical and parametric VaR.
  - Computes additional stats: mean, std, skewness, kurtosis, min, max.
- **CORS:**
  - Configured for cross-origin requests (open in dev, restrict in prod).
- **Logging:**
  - Logs calculation steps and warnings about data quality.

#### Dockerfile

```dockerfile
FROM python:3.12-alpine
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

---

### Frontend: Angular SPA

- **Location:** `angular-frontend/`
- **Dockerized:** See `angular-frontend/Dockerfile`
- **Builds with Node, serves with Nginx**

#### Dockerfile

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist/calculators-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Angular routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to backend
    location /api/ {
        proxy_pass http://calculators-api:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

- **API Proxy:** Requests to `/api/` are proxied to the backend service (`calculators-api`).

---

### Orchestration: Docker Compose

```yaml
services:
  calculators-api:
    build: ./fast-api-backend
    ports:
      - "8080:8080"
    volumes:
      - ./fast-api-backend:/app
    environment:
      - PYTHONPATH=/app
    command: uvicorn main:app --host 0.0.0.0 --port 8080 --reload

  calculators-ui:
    build: ./angular-frontend
    ports:
      - "80:80"
    depends_on:
      - calculators-api
```

- **Two services:**
  - `calculators-api`: FastAPI backend (port 8080)
  - `calculators-ui`: Angular frontend (port 80, depends on backend)
- **API Proxy:** Frontend proxies `/api/` requests to backend.

---

## Summary

- **Purpose:** Provides a web interface and API for calculating financial risk metrics (VaR) using user-supplied data.
- **Tech Stack:**
  - **Frontend:** Angular, served by Nginx
  - **Backend:** FastAPI (Python), with NumPy and SciPy for calculations
  - **Deployment:** Docker Compose for local/dev orchestration
- **Usage:** Users interact with the Angular SPA, which sends data to the FastAPI backend for risk calculations. The backend performs statistical analysis and returns results.

---

**In short:**  
This is a modern, containerized web application for financial risk analytics, with a robust Python backend and a single-page Angular frontend, ready for local or cloud deployment.
