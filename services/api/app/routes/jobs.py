"""GET /api/job/{job_id} and POST /api/job/{job_id}/finalize — job status endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Job, Event
from ..schemas import JobResponse

router = APIRouter(prefix="/api", tags=["jobs"])


async def _get_job_or_404(job_id: uuid.UUID, db: AsyncSession) -> Job:
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@router.get("/job/{job_id}", response_model=JobResponse)
async def get_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    job = await _get_job_or_404(job_id, db)

    # Count events and needs-attention items
    event_count_result = await db.execute(
        select(func.count()).select_from(Event).where(Event.job_id == job_id)
    )
    event_count = event_count_result.scalar() or 0

    attention_result = await db.execute(
        select(func.count())
        .select_from(Event)
        .where(Event.job_id == job_id)
        .where((Event.is_ambiguous == True) | (Event.confidence < 0.6))  # noqa: E712
    )
    needs_attention_count = attention_result.scalar() or 0

    return JobResponse(
        id=job.id,
        status=job.status,
        original_filename=job.original_filename,
        error_message=job.error_message,
        event_count=event_count,
        needs_attention_count=needs_attention_count,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.post("/job/{job_id}/finalize")
async def finalize_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    job = await _get_job_or_404(job_id, db)
    if job.status not in ("needs_review", "ready"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot finalize job with status '{job.status}'.",
        )
    job.status = "ready"
    return {"status": "ready"}
