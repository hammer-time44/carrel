# Production Deployment Guide: Study Workspace Server

## 1. Quick Start via Docker Compose
To run the full-stack synchronization backend with PostgreSQL and MinIO S3 object storage:
```bash
docker compose up -d
```
This launches:
* **Fastify API Server:** Port `4000` (API docs at `http://localhost:4000/docs`)
* **PostgreSQL 16:** Port `5432`
* **MinIO Storage:** Port `9000` (Console at `http://localhost:9001`)

---

## 2. Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Port for the Fastify server |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/study_workspace` | PostgreSQL connection string |
| `JWT_SECRET` | `study-workspace-super-secret-jwt-key-2026` | 32+ character secret for signing user tokens |
| `S3_ENDPOINT` | `http://localhost:9000` | Endpoint for S3/MinIO backups |
| `S3_BUCKET` | `study-workspace-backups` | S3 bucket name |
| `RATE_LIMIT_MAX`| `100` | Maximum requests per minute per IP |

---

## 3. Database Migration & Seeding
```bash
cd server
npm run build
RUN_SEED=true node dist/db/seed.js
```
Creates default demo account: `student@example.com` (Password: `Password123!`).

---

## 4. Monitoring & Telemetry
* Health check: `GET /health`
* Readiness check: `GET /ready`
* Prometheus metrics: `GET /metrics`

