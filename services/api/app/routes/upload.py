"""POST /api/upload — file upload and job creation."""

import os
import uuid
import asyncio
import traceback

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..models import Job, Event
from ..schemas import JobCreateResponse

router = APIRouter(prefix="/api", tags=["upload"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".png", ".jpg", ".jpeg"}


def _run_extraction_sync(job_id: str, file_path: str, original_filename: str = "") -> dict:
    """Run the extraction pipeline synchronously (fallback when Celery is unavailable)."""
    from shared.extraction.text_extractor import extract_text
    from shared.extraction.date_finder import find_date_candidates
    from shared.extraction.event_assembler import assemble_events

    pages = extract_text(file_path)
    if not pages:
        return {"events": [], "error": "No text could be extracted from the uploaded file."}

    candidates = find_date_candidates(pages, filename=original_filename)
    if not candidates:
        return {"events": [], "error": "No dates were found in the document."}

    event_drafts = assemble_events(candidates)

    # Optional LLM classification
    use_llm = os.environ.get("USE_LLM_CLASSIFIER", "false").lower() == "true"
    llm_api_key = os.environ.get("LLM_API_KEY", "")
    if use_llm and llm_api_key:
        try:
            from shared.extraction.llm_classifier import classify_with_llm_sync
            llm_provider = os.environ.get("LLM_PROVIDER", "openai")
            classifications = classify_with_llm_sync(
                candidates=candidates, provider=llm_provider, api_key=llm_api_key
            )
            # Apply LLM results
            cls_map = {c.candidate_index: c for c in classifications}
            for i, draft in enumerate(event_drafts):
                if i in cls_map:
                    c = cls_map[i]
                    if c.title:
                        draft.title = c.title
                    if c.category:
                        draft.category = c.category
                    if c.description:
                        draft.description = c.description
                    draft.confidence = round(max(0.10, min(0.99, draft.confidence + c.confidence_adjustment)), 2)
        except Exception:
            pass  # LLM failure is non-fatal

    return {"events": event_drafts, "error": None}


@router.post("/upload", response_model=JobCreateResponse)
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Create job
    job_id = uuid.uuid4()
    if os.path.isabs(settings.UPLOAD_DIR):
        upload_dir = settings.UPLOAD_DIR
    else:
        upload_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", settings.UPLOAD_DIR)
        )
    job_dir = os.path.join(upload_dir, str(job_id))
    os.makedirs(job_dir, exist_ok=True)

    # Save file
    file_path = os.path.join(job_dir, file.filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Create DB record
    job = Job(
        id=job_id,
        status="queued",
        original_filename=file.filename,
        upload_path=file_path,
    )
    db.add(job)
    await db.flush()

    # Try Celery first; fall back to inline extraction
    celery_dispatched = False
    try:
        from celery import Celery
        import redis as redis_lib

        # Quick check if Redis is reachable
        r = redis_lib.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=1)
        r.ping()

        celery_app = Celery(broker=settings.REDIS_URL)
        celery_app.send_task("app.tasks.process_job", args=[str(job_id)])
        celery_dispatched = True
    except Exception:
        pass

    if not celery_dispatched:
        # Run extraction inline in a thread to avoid blocking the event loop
        job.status = "processing"
        await db.flush()

        try:
            result = await asyncio.to_thread(
                _run_extraction_sync, str(job_id), file_path, file.filename or ""
            )

            if result["error"] and not result["events"]:
                job.status = "needs_review"
                job.error_message = result["error"]
            else:
                has_ambiguous = False
                has_low_confidence = False
                for draft in result["events"]:
                    event = Event(
                        id=draft.id,
                        job_id=job_id,
                        title=draft.title,
                        description=draft.description,
                        date=draft.date,
                        all_day=draft.all_day,
                        category=draft.category,
                        confidence=draft.confidence,
                        source_page=draft.source_page,
                        source_excerpt=draft.source_excerpt,
                        source_kind=draft.source_kind,
                        is_ambiguous=draft.is_ambiguous,
                    )
                    db.add(event)
                    if draft.is_ambiguous:
                        has_ambiguous = True
                    if draft.confidence < 0.6:
                        has_low_confidence = True

                job.status = "needs_review" if (has_ambiguous or has_low_confidence) else "ready"
                job.error_message = None
        except Exception as exc:
            job.status = "failed"
            job.error_message = str(exc)[:1000]

    return JobCreateResponse(job_id=job_id)
