# Syllascribe — Detailed Documentation

This document provides a reference for environment variables, API endpoints, the extraction pipeline, and deployment. For setup and UX conventions, see [README.md](README.md). For Railway Dockerfile configuration, see [RAILWAY_DOCKERFILE_SETUP.md](RAILWAY_DOCKERFILE_SETUP.md).

---

## 1. Environment Variables Reference

Environment: `.env` at project root. On Railway, **Worker** must use **Add Reference** for `DATABASE_URL_SYNC` and `REDIS_URL` — do not use literal `host` URLs.

### API service

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Async Postgres URL for FastAPI (`postgresql+asyncpg://...`). |
| `DATABASE_URL_SYNC` | Yes | Sync Postgres URL for Alembic and worker (`postgresql://...`). |
| `REDIS_URL` | Yes | Redis URL for Celery broker (e.g. `redis://localhost:6379/0`). |
| `UPLOAD_DIR` | Yes | Path to store uploaded PDFs (e.g. `/app/data/uploads`). |
| `RUN_EXTRACTION_INLINE` | No | Set to `true` to run extraction in the API process (no Celery). Use on Railway so the API and Worker don't need shared storage; the Worker then doesn't process uploads. |
| `ALLOWED_ORIGINS` | Yes | Comma-separated CORS origins (e.g. `https://your-web.up.railway.app`). |
| `PORT` | No | Port for uvicorn (default 8000). |
| `USE_LLM_CLASSIFIER` | No | Set to `true` to enable LLM refinement of event titles/categories. |
| `LLM_PROVIDER` | No | e.g. `openai`. |
| `LLM_API_KEY` | No | API key for LLM provider (required if `USE_LLM_CLASSIFIER=true`). |
| `UPLOAD_RETENTION_HOURS` | No | Hours to keep uploads before cleanup (default 168). |

### Worker service

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL_SYNC` | Yes | Sync Postgres URL. On Railway use **Add Reference** → Postgres. |
| `REDIS_URL` | Yes | Redis broker/backend URL. On Railway use **Add Reference** → Redis. |
| `UPLOAD_DIR` | Yes | Same path as API (e.g. `/app/data/uploads`). |
| `USE_LLM_CLASSIFIER` | No | Must match API if using LLM. |
| `LLM_PROVIDER` | No | Same as API. |
| `LLM_API_KEY` | No | Same as API. |

### Web service

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | No* | Public URL of the API (e.g. `https://your-api.up.railway.app`). Baked in at build time; if unset in production, the client uses same-origin and the proxy below is used. |
| `API_BASE_URL` | No* | Backend URL for the **server-side** proxy. Set this when `NEXT_PUBLIC_API_BASE_URL` is unset so that requests to `/api/*` on the Web app are forwarded to the FastAPI service. Runtime-only (no rebuild needed). |
| `PORT` | No | Port for Next.js (default 3000; Railway often uses 8080). |

\* Set either `NEXT_PUBLIC_API_BASE_URL` (client talks to API directly) or `API_BASE_URL` (client talks to same-origin and Next.js proxies to API). Setting both is fine; proxy uses `API_BASE_URL` first.

---

## 2. API Endpoints Reference

Base path: none (routes are at root). All job/event routes use `job_id` (UUID).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check; returns `{"status":"ok"}`. |
| `POST` | `/upload` | Upload a syllabus PDF; creates a job, enqueues processing. Returns `job_id` and initial job status. |
| `GET` | `/job/{job_id}` | Get job status and metadata. |
| `POST` | `/job/{job_id}/finalize` | Mark job as finalized (enables export). |
| `GET` | `/job/{job_id}/events` | List extracted events for the job. |
| `PUT` | `/job/{job_id}/events` | Replace events (used for edits; request body is array of event objects). |
| `GET` | `/job/{job_id}/export.ics` | Download calendar as `.ics` file. |

Request/response shapes use Pydantic models; see `services/api/app/schemas.py` and route modules for details.

---

## 3. Extraction Pipeline (Worker)

The Celery task `app.tasks.process_job` runs the following steps:

1. **Load job** — Fetch job by ID, set status to `processing`.
2. **Extract text** — PDF → text via `packages/shared` (PyMuPDF + OCR fallback with Tesseract/Poppler).
3. **Find dates** — Regex-based date patterns + `dateparser` to get candidate dates and context.
4. **Assemble events** — Deterministic classification (exam, assignment, reading, etc.) from keywords; optional LLM refinement if `USE_LLM_CLASSIFIER=true` (titles/categories only; dates unchanged).
5. **Persist** — Save events to Postgres, set job status to `ready`.
6. **Evidence** — Each event stores source page, excerpt, and matched date string for verification in the UI.

Shared logic lives in `packages/shared`: `text_extractor`, `date_finder`, `event_assembler`, and optionally `llm_classifier`. ICS generation is in `packages/shared/shared/ics_generator.py`.

---

## 4. Project Structure (Detailed)

```
syllascribe/
  apps/web/                    # Next.js 15, TypeScript, Tailwind v4
    src/app/                   # App router pages (page, layout, job/[id])
    src/components/            # UI (timeline, inspector, upload, export)
    src/hooks/, src/lib/       # Hooks and API/autosave helpers
  services/api/                # FastAPI
    app/main.py                # App factory, CORS, routes
    app/routes/                # upload, jobs, events, export
    app/models.py              # SQLAlchemy Job, Event
    alembic/                   # Migrations
  services/worker/             # Celery worker
    worker_app/celery_app.py   # Celery app and REDIS_URL validation
    worker_app/tasks.py        # process_job task
  packages/shared/             # Shared Python package
    shared/extraction/         # text_extractor, date_finder, event_assembler, llm_classifier
    shared/ics_generator.py    # ICS generation
    shared/schemas.py          # Pydantic-like schemas
  infra/                       # docker-compose.yml (Postgres, Redis)
  data/uploads/                # Local uploads (dev); .gitkeep only in repo
```

---

## 5. Deployment Checklist (Railway)

1. **Dockerfile path** — Set per service via `railway.toml` (config path) or variable `RAILWAY_DOCKERFILE_PATH` (see [RAILWAY_DOCKERFILE_SETUP.md](RAILWAY_DOCKERFILE_SETUP.md)).
2. **Postgres + Redis** — Create Postgres and Redis services; note they provide URLs via References.
3. **API** — Set variables from `.env`. Use References for `DATABASE_URL` / `DATABASE_URL_SYNC` / `REDIS_URL`. Set `ALLOWED_ORIGINS` to your Web URL. Set `RUN_EXTRACTION_INLINE=true` so uploads are processed in the API (Railway has no shared volume between API and Worker). The Dockerfile runs `alembic upgrade head` then uvicorn.
4. **Worker** — Set variables from Worker block. **Must** use **Add Reference** for `DATABASE_URL_SYNC` and `REDIS_URL` (literal `host` will not resolve). Worker runs as non-root user `celery`.
5. **Web** — Set `NEXT_PUBLIC_API_BASE_URL` to the API’s **public** URL (e.g. `https://syllascribe-api-production.up.railway.app`). If this is missing or wrong, uploads from the browser will go to the wrong host (e.g. localhost) and hang or fail. Build and start Next.js (Railway may set `PORT=8080`).
6. **Verify** — Check API `/api/health`; upload a PDF and confirm job runs and events appear; export `.ics`.

---

## 6. Troubleshooting Quick Reference

| Symptom | Likely cause | Action |
|---------|----------------|--------|
| `Cannot connect to ... host:6379` (Worker) | Placeholder Redis URL | Set Worker `REDIS_URL` via **Add Reference** → Redis. |
| `REDIS_URL looks like a placeholder` (Worker) | Same | Use **Add Reference**; do not paste example URLs. |
| Postgres connection refused | DB not running or wrong URL | Start `infra/docker-compose`; ensure `postgresql://` for sync URL. |
| OCR fails | Missing system libs | Install `tesseract` and `poppler` (e.g. `brew install tesseract poppler` on macOS). |
| Alembic errors | Wrong DB URL scheme | Use `postgresql://` for `DATABASE_URL_SYNC`, not `postgresql+asyncpg://`. |
| CORS errors in browser | API not allowing Web origin | Add Web app URL to API `ALLOWED_ORIGINS`. |
| Upload hangs or never completes (production) | Web calling wrong API | Set `NEXT_PUBLIC_API_BASE_URL` to the API’s public URL (e.g. `https://your-api.up.railway.app`). Set `NEXT_PUBLIC_API_BASE_URL` (and redeploy) or `API_BASE_URL`; hard-refresh if you still see localhost. |
| Upload returns 404 (production, request to Web /api/upload) | Proxy has no backend URL | Set Web service `API_BASE_URL` to the FastAPI public URL. No rebuild needed. |
| Processing failed: "Upload file not found: /app/data/uploads/..." | API and Worker are separate containers; Worker can't see API's files | Set API `RUN_EXTRACTION_INLINE=true` so extraction runs in the API process. Redeploy API. |

For more context see **Troubleshooting** in [README.md](README.md) and **Worker: Redis and Postgres must use References** in [RAILWAY_DOCKERFILE_SETUP.md](RAILWAY_DOCKERFILE_SETUP.md).
