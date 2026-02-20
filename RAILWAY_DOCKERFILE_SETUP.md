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

### Worker: Redis and Postgres must use References

If the Worker log shows `Cannot connect to redis://...@host:6379... No address associated with hostname`, the Worker is using a **placeholder** URL. On Railway you must set:

- **REDIS_URL** → **Add Reference** → select your Redis service → choose `REDIS_URL`
- **DATABASE_URL_SYNC** → **Add Reference** → select your Postgres service → choose a sync URL (e.g. `DATABASE_URL` if it uses `postgresql://`)

Do **not** paste literal URLs containing `host` — that hostname does not resolve inside Railway’s network. References inject the correct internal host (e.g. `redis.railway.internal`).

Reference: [Railway – Custom Dockerfile path](https://docs.railway.app/deploy/dockerfiles#custom-dockerfile-path)
