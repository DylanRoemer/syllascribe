"""GET /api/job/{job_id}/export.ics — ICS calendar export."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Job, Event

router = APIRouter(prefix="/api", tags=["export"])


@router.get("/job/{job_id}/export.ics")
async def export_ics(
    job_id: uuid.UUID,
    include_low_confidence: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
):
    # Verify job exists
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    # Fetch events
    query = select(Event).where(Event.job_id == job_id).order_by(Event.date)
    if not include_low_confidence:
        query = query.where(Event.confidence >= 0.6)

    events_result = await db.execute(query)
    events = list(events_result.scalars().all())

    if not events:
        raise HTTPException(status_code=404, detail="No events to export.")

    # Generate ICS using shared package
    from shared.ics_generator import generate_ics

    ics_bytes = generate_ics(events)

    filename = f"syllascribe-{job.original_filename.rsplit('.', 1)[0]}.ics"
    return Response(
        content=ics_bytes,
        media_type="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
