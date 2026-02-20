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

The Worker loads the API config (so it needs **DATABASE_URL** as well as **DATABASE_URL_SYNC**). If the Worker log shows `Cannot connect to redis://...@host:6379...` or `DATABASE_URL looks like a placeholder`, set these via **Add Reference** (do **not** paste literal URLs with `host`):

- **DATABASE_URL** → **Add Reference** → your **Postgres** service → **DATABASE_URL**
- **DATABASE_URL_SYNC** → **Add Reference** → your **Postgres** service → **DATABASE_URL** (same reference)
- **REDIS_URL** → **Add Reference** → your **Redis** service → **REDIS_URL**

References inject the correct internal host (e.g. `postgres.railway.internal`, `redis.railway.internal`).

Reference: [Railway – Custom Dockerfile path](https://docs.railway.app/deploy/dockerfiles#custom-dockerfile-path)

---

## API: "The executable `cd` could not be found"

The API image already runs migrations and uvicorn via its Dockerfile **CMD**. If Railway has a **custom start command** (e.g. `cd /app/services/api && alembic ... && uvicorn ...`), it overrides the image and runs that string in a way that treats `cd` as the program name, which fails.

**Fix:** In Railway → **API service** → **Settings** (or **Deploy**), find **Start Command** / **Custom Start Command** and **clear it** (leave it empty). Redeploy. The container will then use the image’s CMD: migrations + uvicorn.

---

## API / Worker: "could not translate host name 'host'"

This means the service is using a **placeholder** database URL (e.g. `postgresql://user:password@host:5432/...`) instead of Railway’s real Postgres URL. The hostname `host` does not resolve inside Railway.

**Fix for API service:**

1. In Railway → **API service** → **Variables**.
2. For **DATABASE_URL** and **DATABASE_URL_SYNC**, use **Add Reference** → your **Postgres** service → choose **DATABASE_URL** (or the URL variable Postgres exposes). Set **both** API variables to that same reference; the app uses the sync URL for Alembic and converts the async one to `postgresql+asyncpg://` internally.
3. Set **REDIS_URL** via **Add Reference** → your **Redis** service → **REDIS_URL**.

**Fix for Worker service:** The Worker loads the API’s config (via `app.models`), which checks **DATABASE_URL** as well as **DATABASE_URL_SYNC**. Set **both** via **Add Reference** → your **Postgres** service → **DATABASE_URL** (same reference for both). Also set **REDIS_URL** via **Add Reference** → your **Redis** service. Do not use literal `host` URLs.

---

## REDIS_URL still shows `redis://...@host:6379` after Add Reference

If the Redis service shows a real URL (e.g. `redis://...@redis.railway.internal:6379`) but the API or Worker still gets `redis://default:password@host:6379` when you use Add Reference, try this:

1. **Remove any literal REDIS_URL**  
   On the **API** (and **Worker**) service Variables tab, delete **REDIS_URL** if it exists. If you or Railway ever pasted from `.env.railway.example`, that would have created a *literal* variable with `host:6379`; that can override or conflict with the reference.

2. **Check project / shared variables**  
   In Railway, open **Project** (or **Shared**) **Variables** (if your plan has them). If there is a **REDIS_URL** there set to `redis://...@host:6379`, remove it or leave it unset so only the **service-level** reference is used.

3. **Add the reference again**  
   On the API service: **Add Variable** → **VARIABLE NAME** = `REDIS_URL` → click **Add Reference**. In the list, pick your **Redis** service (the actual Redis database service, e.g. named "Redis"), then choose **REDIS_URL** (or the URL variable that shows the real host like `redis.railway.internal`). Do **not** pick a "Shared" or template variable that still has `host`.

4. **Fallback: paste the real URL once**  
   If the reference still fills the placeholder: open your **Redis** service → **Variables**, copy the full **REDIS_URL** value (e.g. `redis://default:xxxxx@redis.railway.internal:6379`). On the **API** service, add **REDIS_URL** and paste that value as a normal (non-reference) variable. The API will then use the real Redis. If Redis credentials ever change, you’ll need to update this value. Prefer using Add Reference when it works.
