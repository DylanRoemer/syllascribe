"""Shared Pydantic models used across extraction pipeline and API."""

from __future__ import annotations

import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class PageText(BaseModel):
    """Extracted text from a single page or document section."""
    page: int
    text: str
    source_kind: str = "pdf_text"  # pdf_text | table | ocr | docx


class Candidate(BaseModel):
    """A date candidate found by rule-based extraction."""
    date: date
    raw_match: str
    context: str  # surrounding text snippet
    page: int
    source_kind: str = "pdf_text"
    year_inferred: bool = False
    is_ambiguous: bool = False


class EventDraft(BaseModel):
    """An assembled event ready for DB insertion."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    title: str
    description: Optional[str] = None
    date: date
    all_day: bool = True
    category: str = "other"
    confidence: float = 0.5
    source_page: Optional[int] = None
    source_excerpt: str = ""
    source_kind: str = "pdf_text"
    is_ambiguous: bool = False


class LLMClassification(BaseModel):
    """Result from optional LLM classifier for a single candidate."""
    candidate_index: int
    title: str
    category: str = "other"
    description: Optional[str] = None
    confidence_adjustment: float = 0.0  # additive adjustment to base confidence
