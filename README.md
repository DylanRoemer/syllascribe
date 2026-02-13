# Syllascribe

Upload a course syllabus, extract key dates, review and edit them, then export as an `.ics` calendar file.

## Architecture

- **Frontend**: Next.js (TypeScript) + Tailwind CSS
- **Backend API**: FastAPI (Python) + Pydantic
- **Worker**: Celery (Python) + Redis
- **Database**: PostgreSQL
- **Extraction**: Hybrid approach — deterministic regex/rules find dates, optional LLM classifies events

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose

### 1. Start Infrastructure

```bash
cd infra
docker-compose up -d
```

### 2. Set Up Python Environment

```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install shared package
pip install -e packages/shared

# Install API dependencies
pip install -r services/api/requirements.txt

# Install worker dependencies
pip install -r services/worker/requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example services/api/.env
cp .env.example services/worker/.env
```

### 4. Run Database Migrations

```bash
cd services/api
alembic upgrade head
cd ../..
```

### 5. Start Services (3 terminals)

**Terminal 1 — API:**
```bash
cd services/api
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Worker:**
```bash
cd services/worker
celery -A app.celery_app worker --loglevel=info
```

**Terminal 3 — Frontend:**
```bash
cd apps/web
npm install
npm run dev
```

### 6. Open the App

Navigate to [http://localhost:3000](http://localhost:3000).

## Project Structure

```
syllascribe/
  apps/web/              # Next.js frontend
  services/api/          # FastAPI backend
  services/worker/       # Celery task worker
  packages/shared/       # Shared Python: extraction, ICS generation, schemas
  infra/                 # Docker Compose for Postgres + Redis
  data/uploads/          # Local file storage (dev)
```

## Extraction Approach

1. **Deterministic rules** find candidate dates using regex patterns and parse them with `dateparser`.
2. **Context analysis** classifies events using keyword heuristics (exam, assignment, reading, etc.).
3. **Optional LLM** (feature-flagged via `USE_LLM_CLASSIFIER=true`) refines titles and categories — but cannot invent events or change dates.
4. Every event links back to its source text snippet and page number for human verification.

## Troubleshooting

- **Postgres connection refused**: Ensure `docker-compose up -d` is running and port 5432 is free.
- **Redis connection refused**: Check that Redis container is up on port 6379.
- **OCR not working**: Install `tesseract` and `poppler` system packages (`brew install tesseract poppler` on macOS).
- **Alembic errors**: Make sure `DATABASE_URL_SYNC` in your `.env` uses the `postgresql://` scheme (not `postgresql+asyncpg://`).
