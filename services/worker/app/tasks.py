"""Celery task: process_job — the main extraction pipeline."""

from __future__ import annotations

import os
import uuid
import traceback

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from .celery_app import celery_app

# Database setup (sync, since Celery tasks are synchronous)
DATABASE_URL_SYNC = os.environ.get(
    "DATABASE_URL_SYNC",
    "postgresql://syllascribe:syllascribe@localhost:5432/syllascribe",
)
_engine = create_engine(DATABASE_URL_SYNC)
_SessionLocal = sessionmaker(bind=_engine)


# We need the ORM models — import them from the api service by adding the path
import sys

_services_dir = os.path.join(os.path.dirname(__file__), "..", "..", "api")
if _services_dir not in sys.path:
    sys.path.insert(0, _services_dir)

from app.models import Job, Event  # noqa: E402


@celery_app.task(name="app.tasks.process_job", bind=True, max_retries=2)
def process_job(self, job_id: str) -> dict:
    """Main extraction pipeline for a syllabus upload.

    Steps:
    A) Load job, set status=processing
    B) Extract text from uploaded file
    C) Find date candidates using regex rules
    D) Assemble events with deterministic classification
    E) (Optional) LLM classification
    F) Persist events to DB
    G) Set final job status
    """
    session: Session = _SessionLocal()

    try:
        # A) Load job
        job = session.query(Job).filter(Job.id == uuid.UUID(job_id)).first()
        if job is None:
            return {"error": f"Job {job_id} not found"}

        job.status = "processing"
        session.commit()

        # B) Extract text
        from shared.extraction.text_extractor import extract_text

        file_path = job.upload_path
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Upload file not found: {file_path}")

        pages = extract_text(file_path)
        if not pages:
            raise ValueError("No text could be extracted from the uploaded file.")

        # C) Find date candidates
        from shared.extraction.date_finder import find_date_candidates

        candidates = find_date_candidates(pages, filename=job.original_filename)
        if not candidates:
            # No dates found — set to needs_review with a note
            job.status = "needs_review"
            job.error_message = "No dates were found in the document. The file may be scanned or contain no schedule information."
            session.commit()
            return {"job_id": job_id, "events": 0, "status": "needs_review"}

        # D) Assemble events
        from shared.extraction.event_assembler import assemble_events

        event_drafts = assemble_events(candidates)

        # E) Optional LLM classification
        use_llm = os.environ.get("USE_LLM_CLASSIFIER", "false").lower() == "true"
        llm_api_key = os.environ.get("LLM_API_KEY", "")
        if use_llm and llm_api_key:
            try:
                from shared.extraction.llm_classifier import classify_with_llm_sync

                llm_provider = os.environ.get("LLM_PROVIDER", "openai")
                classifications = classify_with_llm_sync(
                    candidates=candidates,
                    provider=llm_provider,
                    api_key=llm_api_key,
                )
                event_drafts = _apply_llm_classifications(event_drafts, classifications)
            except Exception as llm_err:
                # LLM failure is non-fatal — continue with deterministic results
                print(f"LLM classification failed (non-fatal): {llm_err}")

        # F) Persist events
        has_ambiguous = False
        has_low_confidence = False

        for draft in event_drafts:
            event = Event(
                id=draft.id,
                job_id=uuid.UUID(job_id),
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
            session.add(event)

            if draft.is_ambiguous:
                has_ambiguous = True
            if draft.confidence < 0.6:
                has_low_confidence = True

        # G) Set final status
        if has_ambiguous or has_low_confidence:
            job.status = "needs_review"
        else:
            job.status = "ready"

        job.error_message = None
        session.commit()

        return {
            "job_id": job_id,
            "events": len(event_drafts),
            "status": job.status,
        }

    except Exception as exc:
        session.rollback()
        # Update job status to failed
        try:
            job = session.query(Job).filter(Job.id == uuid.UUID(job_id)).first()
            if job:
                job.status = "failed"
                job.error_message = str(exc)[:1000]
                session.commit()
        except Exception:
            pass

        raise self.retry(exc=exc, countdown=30) if self.request.retries < self.max_retries else exc

    finally:
        session.close()


def _apply_llm_classifications(
    drafts: list,
    classifications: list,
) -> list:
    """Merge LLM classifications into event drafts.

    Hard constraints:
    - Cannot change date
    - Cannot add new events
    """
    from shared.schemas import LLMClassification

    # Index classifications by candidate_index
    cls_map = {}
    for c in classifications:
        if isinstance(c, LLMClassification):
            cls_map[c.candidate_index] = c
        elif isinstance(c, dict):
            cls_map[c.get("candidate_index", -1)] = c

    for i, draft in enumerate(drafts):
        if i in cls_map:
            cls = cls_map[i]
            if isinstance(cls, dict):
                title = cls.get("title")
                category = cls.get("category")
                description = cls.get("description")
                adj = cls.get("confidence_adjustment", 0.0)
            else:
                title = cls.title
                category = cls.category
                description = cls.description
                adj = cls.confidence_adjustment

            if title:
                draft.title = title
            if category:
                draft.category = category
            if description:
                draft.description = description
            draft.confidence = round(max(0.10, min(0.99, draft.confidence + adj)), 2)

    return drafts
