# Railway: Use Dockerfiles (fix "Error creating build plan with Railpack")

Railway only auto-detects a file named `Dockerfile` at the **repo root**. This repo has Dockerfiles in subdirectories, so you must point each service at its Dockerfile.

## Option A: Config as code (recommended)

Per-service config is in the repo. For each service, set **Config path** in Railway: **Service → Settings**:

| Service | Config path |
|--------|----------------|
| **API** | `services/api/railway.toml` |
| **Worker** | `services/worker/railway.toml` |
| **Web** | `apps/web/railway.toml` |

Leave **Root Directory** empty.

## Option B: Variable per service

For **each** of these services (API, Worker, Web), add this **Variable** in Railway:

| Service | Variable name | Value |
|--------|----------------|--------|
| **API** | `RAILWAY_DOCKERFILE_PATH` | `services/api/Dockerfile` |
| **Worker** | `RAILWAY_DOCKERFILE_PATH` | `services/worker/Dockerfile` |
| **Web** | `RAILWAY_DOCKERFILE_PATH` | `apps/web/Dockerfile` |

- Leave each service’s **Root Directory** empty (repo root).
- Redeploy after adding the variable.

**Variables:** Use `.env.railway.example` at repo root. In each service Variables tab use **Suggested variables** or paste the relevant section into the **RAW Editor**.

Reference: [Railway – Custom Dockerfile path](https://docs.railway.app/deploy/dockerfiles#custom-dockerfile-path)
