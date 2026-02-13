"""Pydantic request/response schemas for the FastAPI endpoints."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Job ──────────────────────────────────────────────────────────────────────

class JobResponse(BaseModel):
    id: uuid.UUID
    status: str
    original_filename: str
    error_message: Optional[str] = None
    event_count: int = 0
    needs_attention_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobCreateResponse(BaseModel):
    job_id: uuid.UUID


# ── Event ────────────────────────────────────────────────────────────────────

class EventResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    course_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    date: date
    all_day: bool = True
    category: str
    confidence: float
    source_page: Optional[int] = None
    source_excerpt: str
    source_kind: str
    is_ambiguous: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EventsListResponse(BaseModel):
    events: list[EventResponse]
    needs_attention: NeedsAttention


class NeedsAttention(BaseModel):
    ambiguous_count: int = 0
    low_confidence_count: int = 0
    total: int = 0


# Rebuild EventsListResponse now that NeedsAttention is defined
EventsListResponse.model_rebuild()


class EventUpdate(BaseModel):
    """A single event patch."""
    id: uuid.UUID
    title: Optional[str] = None
    date: Optional[date] = None
    category: Optional[str] = None
    description: Optional[str] = None
    delete: bool = False


class EventsBulkUpdate(BaseModel):
    """Bulk event update payload."""
    updates: list[EventUpdate]
