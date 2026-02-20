# Railway setup guide — every service and variable

This document lists **every Railway service** and **every variable** you need, with **why** each exists. Use it to match your project 1:1 and fix “why isn’t this working” issues.

---

## 1. High-level: what runs where

| Node type | Role | Repo source |
|-----------|------|-------------|
| **Postgres** | Database (jobs, events) | Railway “Add Postgres” — no repo |
| **Redis** | Celery broker + result backend | Railway “Add Redis” — no repo |
| **syllascribe-api** | FastAPI: uploads, jobs, events, export, migrations | This repo, Dockerfile in `services/api/` |
| **syllascribe-worker** | Celery worker: runs extraction (PDF → events) | This repo, Dockerfile in `services/worker/` |
| **syllascribe-web** | Next.js: frontend only, calls API for everything | This repo, Dockerfile in `apps/web/` |

**Flow:** User opens **Web** → Web (browser) calls **API** → API writes to **Postgres**, enqueues task to **Redis** → **Worker** reads from Redis, does work, writes to **Postgres** → Web polls API for job/events.

---

## 2. Build config (so Railway uses the right Dockerfile)

Railway only auto-detects a `Dockerfile` at the **repo root**. This repo has Dockerfiles in subfolders, so each app service must be told which Dockerfile to use.

**Option A — Config path (recommended)**  
For each of the three **app** services (API, Worker, Web):

- **Service → Settings** → find **Config path** (or similar).
- Set it to:
  - **API:** `services/api/railway.toml`
  - **Worker:** `services/worker/railway.toml`
  - **Web:** `apps/web/railway.toml`
- **Root Directory:** leave **empty** (build runs from repo root).

**Option B — Variable**  
If your Railway UI uses a variable instead:

- Add variable **`RAILWAY_DOCKERFILE_PATH`** on each service:
  - **API:** `services/api/Dockerfile`
  - **Worker:** `services/worker/Dockerfile`
  - **Web:** `apps/web/Dockerfile`
- **Root Directory:** leave empty.

**Why:** Without this, Railway tries to use a root Dockerfile (or Nixpacks) and the build fails or builds the wrong thing.

---

## 3. Postgres (database)

- **Add:** Railway dashboard → **New** → **Database** → **Postgres** (or **Add Postgres**).
- **No repo, no Dockerfile.** Railway runs managed Postgres.
- **Variables:** You don’t set variables on Postgres. Railway creates the DB and exposes variables like **`DATABASE_URL`** (and sometimes **`PGHOST`**, **`PGPORT`**, etc.). You will **reference** these from the API and Worker.

**Why it exists:** The API stores jobs and events in Postgres. The Worker reads/writes the same data. Both must point at this same database.

---

## 4. Redis

- **Add:** Railway dashboard → **New** → **Database** → **Redis** (or **Add Redis**).
- **No repo, no Dockerfile.** Railway runs managed Redis.
- **Variables:** Railway exposes **`REDIS_URL`** (and sometimes others). You will **reference** this from the API and Worker.

**Why it exists:** Celery uses Redis as the message broker (queue for tasks) and result backend. The API enqueues “process this job” here; the Worker reads from Redis and runs the task.

---

## 5. syllascribe-api (FastAPI)

**Source:** This repo. **Build:** Dockerfile at `services/api/Dockerfile`. **Start:** Image runs `alembic upgrade head` then `uvicorn app.main:app --host 0.0.0.0 --port 8000`. Do **not** set a custom start command that overrides this (e.g. one that uses `cd`), or the container can fail.

### Variables (set on the **API** service)

| Variable | How to set | Why |
|----------|------------|-----|
| **DATABASE_URL** | **Add Reference** → your **Postgres** service → **DATABASE_URL** | Async Postgres URL for FastAPI. The API code converts `postgresql://` to `postgresql+asyncpg://` if needed. If you paste a literal URL with `host`, the hostname won’t resolve and the API will crash. |
| **DATABASE_URL_SYNC** | **Add Reference** → your **Postgres** service → **DATABASE_URL** (same reference as above) | Sync URL for Alembic migrations (run on container start). Same DB as above; sync driver for migration tooling. |
| **REDIS_URL** | **Add Reference** → your **Redis** service → **REDIS_URL** | Celery broker/backend. API enqueues tasks here. Literal `host` won’t resolve. |
| **UPLOAD_DIR** | Literal: ` /app/data/uploads` | Path inside the container where uploaded PDFs are stored. Must match what the Dockerfile expects; Worker must use the same path if they share storage (see Worker). |
| **ALLOWED_ORIGINS** | Literal: your **Web** app’s public URL, e.g. `https://sylliscribe-web-production.up.railway.app` | CORS: browser only allows requests from these origins. Use the exact URL users use to open the app (no trailing slash is fine). If wrong, browser blocks API calls and you get CORS errors. |
| **PORT** | Optional. Default in Dockerfile is 8000. | Railway may inject PORT; if so, leave it or set 8000 so uvicorn and Railway agree. |
| **USE_LLM_CLASSIFIER** | Optional. Literal: `false` (or `true` if you use LLM) | Feature flag for LLM-based event classification. |
| **LLM_PROVIDER** | Optional. e.g. `openai` | Only needed if USE_LLM_CLASSIFIER is true. |
| **LLM_API_KEY** | Optional. | Only needed if USE_LLM_CLASSIFIER is true. |
| **UPLOAD_RETENTION_HOURS** | Optional. e.g. `168` (7 days) | How long to keep uploaded files before cleanup. |

**Critical:** Do **not** paste example URLs from `.env.railway.example` that contain `host` (e.g. `postgresql://user:password@host:5432/...`). Use **Add Reference** so Railway injects the real host (e.g. `postgres.railway.internal`).

---

## 6. syllascribe-worker (Celery)

**Source:** This repo. **Build:** Dockerfile at `services/worker/Dockerfile`. **Start:** Image runs Celery worker (`worker_app.celery_app`). No custom start command needed.

The Worker process **imports the API’s `app.models`** (and thus the API’s `config`). So when the Worker starts, it loads `Settings()` from the API and the placeholder check runs. That’s why the Worker **must** have **DATABASE_URL** and **DATABASE_URL_SYNC** set (via Reference), not just DATABASE_URL_SYNC — otherwise the API’s config can exit with “placeholder” before the Worker even runs tasks.

### Variables (set on the **Worker** service)

| Variable | How to set | Why |
|----------|------------|-----|
| **DATABASE_URL** | **Add Reference** → your **Postgres** service → **DATABASE_URL** | Worker imports API’s config; config validates DATABASE_URL. Must be set so the process doesn’t exit. Worker uses sync URL for its own DB work; this is just to satisfy the shared config. |
| **DATABASE_URL_SYNC** | **Add Reference** → your **Postgres** service → **DATABASE_URL** (same as above) | Actual DB connection for the Worker (sync SQLAlchemy). Same Postgres as the API. |
| **REDIS_URL** | **Add Reference** → your **Redis** service → **REDIS_URL** | Celery broker and result backend. Worker reads tasks from here. Literal `host` won’t resolve. |
| **UPLOAD_DIR** | Literal: ` /app/data/uploads` | Must match API so the Worker can read the files the API stored. (If API and Worker don’t share a volume on Railway, uploads might need to be in a shared volume or storage — the code assumes the same path.) |
| **USE_LLM_CLASSIFIER** | Optional. Same as API. | Should match API if you use LLM. |
| **LLM_PROVIDER** | Optional. | Same as API. |
| **LLM_API_KEY** | Optional. | Same as API. |

**Critical:** Use **Add Reference** for **DATABASE_URL**, **DATABASE_URL_SYNC**, and **REDIS_URL**. Do not paste literal URLs with `host`.

---

## 7. syllascribe-web (Next.js)

**Source:** This repo. **Build:** Dockerfile at `apps/web/Dockerfile`. **Start:** Usually `npm run start` (or whatever the Dockerfile/railway.toml specifies). Railway may set PORT (e.g. 8080).

**Important:** `NEXT_PUBLIC_*` variables are **inlined at build time** into the JavaScript bundle. So the value that exists **when the Web service is built** is what the browser gets. Changing the variable after a build doesn’t change the already-built app until you **trigger a new deploy** (new build).

### Variables (set on the **Web** service)

| Variable | How to set | Why |
|----------|------------|-----|
| **NEXT_PUBLIC_API_BASE_URL** | Literal: your **API** service’s **public** URL, **with** `https://`, e.g. `https://syllascribe-api-production.up.railway.app` | The browser needs this to call the API (upload, jobs, events, export). Must be **public** (the URL users’ browsers can reach). Must include **https://** so the browser treats it as an absolute URL to the API host; without it, the request can be sent to the wrong host and uploads hang or fail. If missing at build time, the app falls back to `http://localhost:8000` and the “uploads disabled” message appears in production. |
| **PORT** | Optional. Railway often sets 8080. | Next.js listens on this port. Match what Railway expects. |

**Critical:**  
- Use the **API** service URL, **not** the Web app URL.  
- Include **https://** (e.g. `https://syllascribe-api-production.up.railway.app`).  
- After changing this, **redeploy the Web service** so a new build runs with the new value.

---

## 8. One-page checklist

- [ ] **Postgres** and **Redis** added; no variables to set on them.
- [ ] **API** service: Config path `services/api/railway.toml` (or RAILWAY_DOCKERFILE_PATH = `services/api/Dockerfile`); Root Directory empty.
- [ ] **API** variables: DATABASE_URL, DATABASE_URL_SYNC, REDIS_URL via **Add Reference** (Postgres / Redis). UPLOAD_DIR = `/app/data/uploads`. ALLOWED_ORIGINS = your Web public URL (e.g. `https://sylliscribe-web-production.up.railway.app`). No custom start command.
- [ ] **Worker** service: Config path `services/worker/railway.toml` (or RAILWAY_DOCKERFILE_PATH = `services/worker/Dockerfile`); Root Directory empty.
- [ ] **Worker** variables: DATABASE_URL, DATABASE_URL_SYNC, REDIS_URL via **Add Reference**. UPLOAD_DIR = `/app/data/uploads`.
- [ ] **Web** service: Config path `apps/web/railway.toml` (or RAILWAY_DOCKERFILE_PATH = `apps/web/Dockerfile`); Root Directory empty.
- [ ] **Web** variables: NEXT_PUBLIC_API_BASE_URL = **https://** + your API public host (e.g. `https://syllascribe-api-production.up.railway.app`). Then **redeploy Web** so the new value is baked into the build.

---

## 9. Why “things aren’t working” — quick map

| Symptom | Check |
|---------|--------|
| Upload stuck at 0% / “Uploads are disabled” | Web: NEXT_PUBLIC_API_BASE_URL = full API URL **with https://**; **redeploy Web** after changing. |
| CORS errors in browser | API: ALLOWED_ORIGINS includes the exact Web URL users use. |
| API/Worker: “could not translate host name 'host'” | API and Worker: DATABASE_URL, DATABASE_URL_SYNC, REDIS_URL set via **Add Reference**, not literal `...@host:...`. |
| Worker never processes jobs | Worker: REDIS_URL and DATABASE_URL_SYNC via Reference; Worker and API point at same Postgres and Redis. |
| Build fails / wrong app | Each app service: correct Dockerfile path (config path or RAILWAY_DOCKERFILE_PATH); Root Directory empty. |

This guide is the single place to align your Railway project with the app’s expectations. If something still fails, compare each service and variable against the tables above.
