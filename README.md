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
celery -A worker_app.celery_app worker --loglevel=info
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
  services/worker/       # Celery task worker (entry: worker_app.celery_app)
  packages/shared/       # Shared Python: extraction, ICS generation, schemas
  infra/                 # Docker Compose for Postgres + Redis
  data/uploads/          # Local file storage (dev)
```

## Extraction Approach

1. **Deterministic rules** find candidate dates using regex patterns and parse them with `dateparser`.
2. **Context analysis** classifies events using keyword heuristics (exam, assignment, reading, etc.).
3. **Optional LLM** (feature-flagged via `USE_LLM_CLASSIFIER=true`) refines titles and categories — but cannot invent events or change dates.
4. Every event links back to its source text snippet and page number for human verification.

## Design / UX Conventions

### Theme and Dark Mode

The app supports light and dark modes via `next-themes` with Tailwind's `class` strategy. The theme toggle is in the header. The system preference is respected by default. Design tokens (colors, radii, shadows, typography) are defined as CSS custom properties in `globals.css` using Tailwind v4's `@theme` directive.

- **Light mode**: Slate-50 surface, white cards, slate-900 text
- **Dark mode**: Slate-900 surface, slate-850 cards, slate-100 text
- No pure black (`#000`) or pure white (`#fff`) backgrounds

### Typography

- **Headings**: Lora (serif) — loaded via `next/font/google`
- **Body**: Inter (sans) — loaded via `next/font/google`
- **Dates**: Tabular numerals (`font-variant-numeric: tabular-nums`) for alignment

### "Needs Attention" Signal

Events that are ambiguous or have low confidence (below 60%) are flagged as needing review:

- **Timeline row**: Amber-tinted background, amber "Review" badge with warning icon
- **Timeline dot**: Gold/amber color instead of neutral gray
- **Inspector panel**: The `NeedsAttentionCard` shows total counts and provides filter buttons to isolate these events
- **Filter**: The "Needs attention" filter pill shows only flagged events

This uses an amber/gold accent palette — never red, which is reserved for actual errors.

### Evidence and Source Verification

Every extracted event carries source evidence (page number, source kind, raw text excerpt). This is accessible in the **Inspector Panel** (right pane on desktop, bottom sheet on mobile) when an event is selected. The matched date string is highlighted in the excerpt. Evidence is always visible on selection — there is no toggle to hide it.

### Component Architecture

The review screen uses a split-view layout:

- **Left pane**: `TimelineEventList` — scrollable, grouped by date with sticky headers and a vertical timeline guide line
- **Right pane**: `InspectorPanel` — sticky, shows filters/overview when nothing is selected, edit form + evidence when one event is selected, bulk actions when multiple are selected
- **Mobile**: Single-column timeline with a `MobileBottomSheet` for the inspector, and a sticky bottom action bar

### Autosave

Edits are autosaved after 1.2 seconds of inactivity via a debounced PUT to the existing events endpoint. Save status ("Saving..." / "Saved" / error) is shown in the top action bar with `aria-live="polite"` for screen readers.

## Deployment (Railway)

- Use `.env.railway.example` as a template. For **Worker** variables, set `DATABASE_URL_SYNC` and `REDIS_URL` via **Add Reference** → Postgres / Redis — do not paste literal URLs with `host`; the worker will fail to connect.
- The API Dockerfile runs `alembic upgrade head` before starting uvicorn so migrations run on deploy.
- See `RAILWAY_DOCKERFILE_SETUP.md` for Dockerfile-based Railway setup.

## Troubleshooting

- **Postgres connection refused**: Ensure `docker-compose up -d` is running and port 5432 is free.
- **Redis connection refused**: Check that Redis container is up on port 6379.
- **OCR not working**: Install `tesseract` and `poppler` system packages (`brew install tesseract poppler` on macOS).
- **Alembic errors**: Make sure `DATABASE_URL_SYNC` in your `.env` uses the `postgresql://` scheme (not `postgresql+asyncpg://`).
- **Worker "REDIS_URL looks like a placeholder"**: On Railway, set Worker variables via **Add Reference** → Redis (and Postgres for `DATABASE_URL_SYNC`), not literal placeholder URLs.
