"""GET/PUT /api/job/{job_id}/events — event listing and bulk editing."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Job, Event
from ..schemas import (
    EventResponse,
    EventsBulkUpdate,
    EventsListResponse,
    NeedsAttention,
)

router = APIRouter(prefix="/api", tags=["events"])


@router.get("/job/{job_id}/events", response_model=EventsListResponse)
async def get_events(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    # Verify job exists
    result = await db.execute(select(Job).where(Job.id == job_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    # Fetch events sorted by date
    events_result = await db.execute(
        select(Event).where(Event.job_id == job_id).order_by(Event.date, Event.title)
    )
    events = list(events_result.scalars().all())

    # Calculate needs_attention counts
    ambiguous_count = sum(1 for e in events if e.is_ambiguous)
    low_confidence_count = sum(1 for e in events if e.confidence < 0.6)
    total_attention = sum(1 for e in events if e.is_ambiguous or e.confidence < 0.6)

    return EventsListResponse(
        events=[EventResponse.model_validate(e) for e in events],
        needs_attention=NeedsAttention(
            ambiguous_count=ambiguous_count,
            low_confidence_count=low_confidence_count,
            total=total_attention,
        ),
    )


@router.put("/job/{job_id}/events")
async def update_events(
    job_id: uuid.UUID,
    payload: EventsBulkUpdate,
    db: AsyncSession = Depends(get_db),
):
    # Verify job exists
    result = await db.execute(select(Job).where(Job.id == job_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    updated = 0
    deleted = 0

    for update in payload.updates:
        event_result = await db.execute(
            select(Event).where(Event.id == update.id, Event.job_id == job_id)
        )
        event = event_result.scalar_one_or_none()
        if event is None:
            continue  # skip unknown events silently

        if update.delete:
            await db.delete(event)
            deleted += 1
            continue

        if update.title is not None:
            event.title = update.title
        if update.date is not None:
            event.date = update.date
        if update.category is not None:
            event.category = update.category
        if update.description is not None:
            event.description = update.description
        updated += 1

    return {"updated": updated, "deleted": deleted}
