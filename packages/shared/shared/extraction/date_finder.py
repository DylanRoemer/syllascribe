"""Rule-based date candidate extraction.

Finds explicit dates in text using regex patterns, parses them with dateparser,
captures surrounding context, and handles year inference.
"""

from __future__ import annotations

import hashlib
import re
from datetime import date, datetime
from typing import Optional

import dateparser

from ..schemas import Candidate, PageText

# ── Compiled regex patterns ──────────────────────────────────────────────────

# Month name forms: "Feb 13", "February 13, 2026", "Feb. 13"
_MONTH_NAMES = (
    r"Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?"
)
MONTH_NAME_DATE_RE = re.compile(
    rf"\b({_MONTH_NAMES})\s*\.?\s*(\d{{1,2}})(?:\s*,?\s*(\d{{4}}))?\b",
    re.IGNORECASE,
)

# Numeric forms: "2/13", "02/13/2026", "2/13/26"
NUMERIC_DATE_RE = re.compile(
    r"\b(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?\b"
)

# ISO form: "2026-02-13"
ISO_DATE_RE = re.compile(
    r"\b(\d{4})-(\d{2})-(\d{2})\b"
)

# Term hint pattern: "Spring 2026", "Fall 2025", etc.
TERM_HINT_RE = re.compile(
    r"\b(Spring|Summer|Fall|Autumn|Winter)\s+(\d{4})\b",
    re.IGNORECASE,
)


def find_date_candidates(
    pages: list[PageText],
    term_hint: Optional[str] = None,
) -> list[Candidate]:
    """Find all date candidates across extracted pages.

    Args:
        pages: List of PageText objects from text extraction.
        term_hint: Optional term string (e.g. "Spring 2026") to help infer year.

    Returns:
        Deduplicated list of Candidate objects.
    """
    # Try to infer year from document content if no term hint provided
    inferred_year = _infer_year_from_hint(term_hint) if term_hint else None
    if inferred_year is None:
        inferred_year = _scan_for_term_year(pages)

    candidates: list[Candidate] = []
    for page in pages:
        page_candidates = _find_dates_in_text(
            text=page.text,
            page=page.page,
            source_kind=page.source_kind,
            inferred_year=inferred_year,
        )
        candidates.extend(page_candidates)

    return _deduplicate(candidates)


def _infer_year_from_hint(term_hint: str) -> Optional[int]:
    """Extract year from a term hint string like 'Spring 2026'."""
    match = TERM_HINT_RE.search(term_hint)
    if match:
        return int(match.group(2))
    # Try plain year
    year_match = re.search(r"\b(20\d{2})\b", term_hint)
    if year_match:
        return int(year_match.group(1))
    return None


def _scan_for_term_year(pages: list[PageText]) -> Optional[int]:
    """Scan all page text for a term/year pattern."""
    for page in pages:
        match = TERM_HINT_RE.search(page.text)
        if match:
            return int(match.group(2))
    # Fallback: look for any 4-digit year near common term words
    for page in pages:
        year_matches = re.findall(r"\b(20\d{2})\b", page.text)
        if year_matches:
            # Return the most common year
            from collections import Counter
            counter = Counter(year_matches)
            return int(counter.most_common(1)[0][0])
    return None


def _find_dates_in_text(
    text: str,
    page: int,
    source_kind: str,
    inferred_year: Optional[int],
) -> list[Candidate]:
    """Find date candidates in a single page of text."""
    candidates: list[Candidate] = []
    current_year = datetime.now().year

    # ── Month name dates ─────────────────────────────────────────────────
    for match in MONTH_NAME_DATE_RE.finditer(text):
        raw = match.group(0)
        has_year = match.group(3) is not None
        context = _extract_context(text, match.start(), match.end())
        year_inferred = not has_year

        parsed = _safe_parse(raw, inferred_year if year_inferred else None)
        if parsed is None:
            continue

        candidates.append(Candidate(
            date=parsed,
            raw_match=raw,
            context=context,
            page=page,
            source_kind=source_kind,
            year_inferred=year_inferred,
            is_ambiguous=year_inferred and inferred_year is None,
        ))

    # ── Numeric dates ────────────────────────────────────────────────────
    for match in NUMERIC_DATE_RE.finditer(text):
        raw = match.group(0)
        month_str, day_str, year_str = match.group(1), match.group(2), match.group(3)
        has_year = year_str is not None
        context = _extract_context(text, match.start(), match.end())

        # Check for ambiguous format (e.g., 02/03 could be Feb 3 or Mar 2)
        month_val = int(month_str)
        day_val = int(day_str)
        format_ambiguous = (
            month_val <= 12 and day_val <= 12 and month_val != day_val
        )

        year_inferred = not has_year
        parsed = _safe_parse(raw, inferred_year if year_inferred else None)
        if parsed is None:
            continue

        candidates.append(Candidate(
            date=parsed,
            raw_match=raw,
            context=context,
            page=page,
            source_kind=source_kind,
            year_inferred=year_inferred,
            is_ambiguous=(year_inferred and inferred_year is None) or format_ambiguous,
        ))

    # ── ISO dates ────────────────────────────────────────────────────────
    for match in ISO_DATE_RE.finditer(text):
        raw = match.group(0)
        context = _extract_context(text, match.start(), match.end())

        parsed = _safe_parse(raw, None)
        if parsed is None:
            continue

        candidates.append(Candidate(
            date=parsed,
            raw_match=raw,
            context=context,
            page=page,
            source_kind=source_kind,
            year_inferred=False,
            is_ambiguous=False,
        ))

    return candidates


def _safe_parse(raw: str, override_year: Optional[int] = None) -> Optional[date]:
    """Parse a date string safely using dateparser.

    Returns a date object or None if parsing fails.
    """
    settings_dict = {
        "STRICT_PARSING": True,
        "PREFER_DATES_FROM": "future",
    }
    if override_year:
        settings_dict["RELATIVE_BASE"] = datetime(override_year, 1, 1)

    try:
        result = dateparser.parse(raw, settings=settings_dict)
        if result is None:
            # Try with less strict settings
            result = dateparser.parse(raw, settings={"PREFER_DATES_FROM": "future"})
        if result is not None:
            if override_year and result.year != override_year:
                result = result.replace(year=override_year)
            return result.date()
    except Exception:
        pass
    return None


def _extract_context(text: str, start: int, end: int, window: int = 120) -> str:
    """Extract surrounding context for a date match.

    Uses a character window, but snaps to line boundaries when reasonable.
    """
    # Character window
    ctx_start = max(0, start - window)
    ctx_end = min(len(text), end + window)

    # Try to snap to line boundaries
    line_start = text.rfind("\n", ctx_start, start)
    if line_start == -1:
        line_start = ctx_start
    else:
        line_start += 1  # skip the newline

    line_end = text.find("\n", end, ctx_end)
    if line_end == -1:
        line_end = ctx_end

    # Use line-snapped boundaries if they're not too far from the character window
    final_start = line_start if (start - line_start) <= window else ctx_start
    final_end = line_end if (line_end - end) <= window else ctx_end

    snippet = text[final_start:final_end].strip()
    return snippet


def _deduplicate(candidates: list[Candidate]) -> list[Candidate]:
    """Remove near-duplicate candidates (same date + very similar context)."""
    seen: set[str] = set()
    result: list[Candidate] = []

    for c in candidates:
        # Create a dedup key from date + normalized context hash
        ctx_normalized = re.sub(r"\s+", " ", c.context.strip().lower())
        ctx_hash = hashlib.md5(ctx_normalized.encode()).hexdigest()[:8]
        key = f"{c.date.isoformat()}:{c.page}:{ctx_hash}"

        if key not in seen:
            seen.add(key)
            result.append(c)

    return result
