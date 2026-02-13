"""Deterministic event assembly from date candidates.

Classifies candidates using keyword heuristics, extracts titles,
assigns confidence scores, and flags ambiguity.
"""

from __future__ import annotations

import re
from typing import Optional

from ..schemas import Candidate, EventDraft

# ── Category keyword sets ────────────────────────────────────────────────────

CATEGORY_KEYWORDS: dict[str, set[str]] = {
    "exam": {"midterm", "final", "exam", "quiz", "test"},
    "assignment": {
        "due", "submit", "assignment", "homework", "hw", "paper",
        "essay", "project", "lab report", "problem set", "pset",
    },
    "reading": {"read", "reading", "chapter", "ch."},
    "holiday": {"no class", "holiday", "break", "recess", "thanksgiving", "labor day"},
    "office_hours": {"office hours", "office hour"},
}

# Words/phrases that strongly indicate an event is actionable
STRONG_KEYWORDS = {
    "exam": {"midterm", "final", "exam", "quiz"},
    "assignment": {"due", "submit", "assignment", "homework"},
}


def assemble_events(candidates: list[Candidate]) -> list[EventDraft]:
    """Convert date candidates into event drafts with classification and confidence.

    Args:
        candidates: List of Candidate objects from date_finder.

    Returns:
        List of EventDraft objects ready for DB insertion.
    """
    events: list[EventDraft] = []
    for candidate in candidates:
        category = _classify_category(candidate.context)
        title = _extract_title(candidate.context, candidate.raw_match, category)
        confidence = _score_confidence(candidate.context, category, candidate)

        events.append(EventDraft(
            title=title,
            description=None,
            date=candidate.date,
            all_day=True,
            category=category,
            confidence=confidence,
            source_page=candidate.page,
            source_excerpt=candidate.context[:500],  # cap excerpt length
            source_kind=candidate.source_kind,
            is_ambiguous=candidate.is_ambiguous,
        ))

    return events


def _classify_category(context: str) -> str:
    """Classify an event's category using keyword matching on the context."""
    ctx_lower = context.lower()

    # Check multi-word keywords first (e.g., "no class", "office hours")
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if " " in keyword and keyword in ctx_lower:
                return category

    # Check single-word keywords
    # Tokenize context into words for more precise matching
    words = set(re.findall(r"\b\w+\b", ctx_lower))
    for category, keywords in CATEGORY_KEYWORDS.items():
        single_word_keywords = {k for k in keywords if " " not in k}
        if words & single_word_keywords:
            return category

    return "other"


def _extract_title(context: str, raw_match: str, category: str) -> str:
    """Extract a concise title from the context around the date match.

    Strategy:
    1. Find the line containing the date match.
    2. Remove the date itself.
    3. Clean up to ~60 chars.
    4. Fallback to category-based title.
    """
    # Split context into lines and find the one with the date
    lines = context.split("\n")
    target_line = ""
    for line in lines:
        if raw_match in line:
            target_line = line
            break
    if not target_line:
        target_line = lines[0] if lines else ""

    # Remove the date match from the line
    title = target_line.replace(raw_match, "").strip()

    # Clean up common delimiters and whitespace
    title = re.sub(r"^[\s\-–—:,.|]+", "", title)
    title = re.sub(r"[\s\-–—:,.|]+$", "", title)
    title = re.sub(r"\s+", " ", title).strip()

    # Truncate to reasonable length
    if len(title) > 80:
        # Try to cut at a word boundary
        title = title[:77].rsplit(" ", 1)[0] + "..."

    # Fallback if title is empty or too short
    if len(title) < 3:
        category_display = category.replace("_", " ").title()
        title = f"{category_display} - {raw_match}"

    return title


def _score_confidence(context: str, category: str, candidate: Candidate) -> float:
    """Assign a confidence score based on keyword strength and context quality.

    Scoring:
    - Strong keyword + date in same sentence: 0.85–0.95
    - Moderate keyword nearby: 0.65–0.80
    - Date with weak/no context: 0.40–0.60
    """
    ctx_lower = context.lower()
    base_score = 0.50

    # Check for strong keywords
    if category in STRONG_KEYWORDS:
        strong_matches = sum(
            1 for kw in STRONG_KEYWORDS[category] if kw in ctx_lower
        )
        if strong_matches >= 2:
            base_score = 0.92
        elif strong_matches == 1:
            base_score = 0.87
    elif category in CATEGORY_KEYWORDS:
        # Non-strong but categorized
        base_score = 0.72
    else:
        # "other" category — weak context
        base_score = 0.45

    # Adjustments
    # Penalize if context is very short (less signal)
    if len(context.strip()) < 30:
        base_score -= 0.10

    # Penalize if year was inferred
    if candidate.year_inferred:
        base_score -= 0.05

    # Penalize if ambiguous
    if candidate.is_ambiguous:
        base_score -= 0.10

    # Boost if context looks like a schedule entry (common patterns)
    schedule_patterns = [
        r"week\s+\d+",
        r"(mon|tue|wed|thu|fri|sat|sun)\w*day",
        r"lecture\s+\d+",
        r"class\s+\d+",
    ]
    for pattern in schedule_patterns:
        if re.search(pattern, ctx_lower):
            base_score += 0.03

    # Clamp to valid range
    return round(max(0.10, min(0.99, base_score)), 2)
