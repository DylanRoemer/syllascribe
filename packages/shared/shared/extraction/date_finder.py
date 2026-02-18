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

# Month abbreviation to number mapping
_MONTH_MAP: dict[str, int] = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

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

# Year pattern in filenames: "2026", "Winter 2026", etc.
YEAR_IN_FILENAME_RE = re.compile(r"\b(20\d{2})\b")


def find_date_candidates(
    pages: list[PageText],
    term_hint: Optional[str] = None,
    filename: Optional[str] = None,
) -> list[Candidate]:
    """Find all date candidates across extracted pages.

    Args:
        pages: List of PageText objects from text extraction.
        term_hint: Optional term string (e.g. "Spring 2026") to help infer year.
        filename: Optional original filename to extract year hints from.

    Returns:
        Deduplicated list of Candidate objects.
    """
    # Try to infer year from explicit hint, then document content, then filename
    inferred_year = _infer_year_from_hint(term_hint) if term_hint else None
    if inferred_year is None:
        inferred_year = _scan_for_term_year(pages)
    if inferred_year is None and filename:
        inferred_year = _infer_year_from_filename(filename)
    if inferred_year is None:
        # Last resort: use current year
        inferred_year = datetime.now().year

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
    year_match = re.search(r"\b(20\d{2})\b", term_hint)
    if year_match:
        return int(year_match.group(1))
    return None


def _infer_year_from_filename(filename: str) -> Optional[int]:
    """Extract year from a filename like 'Hogan - Macro Syllabus Winter 2026-02-03.pdf'."""
    # Normalize underscores/hyphens to spaces for matching
    normalized = re.sub(r"[_\-]", " ", filename)
    # Try term + year first
    match = TERM_HINT_RE.search(normalized)
    if match:
        return int(match.group(2))
    # Try any 4-digit year (search normalized string so word boundaries work)
    years = YEAR_IN_FILENAME_RE.findall(normalized)
    if years:
        # Return the first plausible year (closest to current)
        current = datetime.now().year
        best = min(years, key=lambda y: abs(int(y) - current))
        return int(best)
    return None


def _scan_for_term_year(pages: list[PageText]) -> Optional[int]:
    """Scan all page text for a term/year pattern."""
    for page in pages:
        match = TERM_HINT_RE.search(page.text)
        if match:
            return int(match.group(2))
    # Fallback: look for any 4-digit year in document text
    from collections import Counter
    all_years: list[str] = []
    for page in pages:
        # Only match years that look like academic years (not course numbers like 1400)
        year_matches = re.findall(r"\b(20[2-3]\d)\b", page.text)
        all_years.extend(year_matches)
    if all_years:
        counter = Counter(all_years)
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
    current_year = inferred_year or datetime.now().year

    # ── Month name dates ─────────────────────────────────────────────────
    for match in MONTH_NAME_DATE_RE.finditer(text):
        raw = match.group(0)
        month_name = match.group(1).lower().rstrip(".")
        day = int(match.group(2))
        explicit_year = match.group(3)
        has_year = explicit_year is not None
        context = _extract_context(text, match.start(), match.end())

        # Construct date directly from regex groups
        month_num = _MONTH_MAP.get(month_name)
        if month_num is None:
            continue
        year = int(explicit_year) if has_year else current_year

        parsed = _safe_construct_date(year, month_num, day)
        if parsed is None:
            continue

        candidates.append(Candidate(
            date=parsed,
            raw_match=raw,
            context=context,
            page=page,
            source_kind=source_kind,
            year_inferred=not has_year,
            is_ambiguous=not has_year and inferred_year is None,
        ))

    # ── Numeric dates ────────────────────────────────────────────────────
    for match in NUMERIC_DATE_RE.finditer(text):
        raw = match.group(0)
        month_val = int(match.group(1))
        day_val = int(match.group(2))
        year_str = match.group(3)
        has_year = year_str is not None
        context = _extract_context(text, match.start(), match.end())

        # Validate month/day ranges
        if month_val < 1 or month_val > 12:
            continue
        if day_val < 1 or day_val > 31:
            continue

        # Check for ambiguous format (e.g., 02/03 could be Feb 3 or Mar 2)
        format_ambiguous = (
            month_val <= 12 and day_val <= 12 and month_val != day_val
        )

        # Determine year
        if has_year:
            year = int(year_str)
            if year < 100:
                year += 2000  # "26" -> 2026
        else:
            year = current_year

        # Construct date directly (no dateparser needed for numeric)
        parsed = _safe_construct_date(year, month_val, day_val)
        if parsed is None:
            continue

        year_inferred = not has_year
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

        year = int(match.group(1))
        month = int(match.group(2))
        day = int(match.group(3))
        parsed = _safe_construct_date(year, month, day)
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


def _safe_construct_date(year: int, month: int, day: int) -> Optional[date]:
    """Construct a date object safely, returning None if invalid."""
    try:
        return date(year, month, day)
    except (ValueError, OverflowError):
        return None


def _safe_parse(raw: str, override_year: Optional[int] = None) -> Optional[date]:
    """Parse a date string safely using dateparser (for month-name forms).

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
    ctx_start = max(0, start - window)
    ctx_end = min(len(text), end + window)

    line_start = text.rfind("\n", ctx_start, start)
    if line_start == -1:
        line_start = ctx_start
    else:
        line_start += 1

    line_end = text.find("\n", end, ctx_end)
    if line_end == -1:
        line_end = ctx_end

    final_start = line_start if (start - line_start) <= window else ctx_start
    final_end = line_end if (line_end - end) <= window else ctx_end

    snippet = text[final_start:final_end].strip()
    return snippet


def _deduplicate(candidates: list[Candidate]) -> list[Candidate]:
    """Remove near-duplicate candidates.

    Uses (date, page) as the primary key. When the same date+page appears from both
    pdf_text and table sources, prefers the table source (cleaner structure).
    Also collapses candidates with very similar context on the same date+page.
    """
    # Group by (date, page)
    groups: dict[str, list[Candidate]] = {}
    for c in candidates:
        key = f"{c.date.isoformat()}:{c.page}"
        if key not in groups:
            groups[key] = []
        groups[key].append(c)

    result: list[Candidate] = []
    for key, group in groups.items():
        if len(group) == 1:
            result.append(group[0])
            continue

        # Multiple candidates for same date+page.
        # Separate by source_kind
        table_candidates = [c for c in group if c.source_kind == "table"]
        text_candidates = [c for c in group if c.source_kind != "table"]

        if table_candidates and text_candidates:
            # Both table and text found the same date on the same page.
            # Keep only the table version (cleaner structure, better title extraction).
            chosen = table_candidates
        else:
            chosen = group

        # Within the chosen set, dedup by normalized context
        seen_hashes: set[str] = set()
        for c in chosen:
            # Normalize: remove pipes, extra spaces, lowercase
            ctx_norm = re.sub(r"[|\s]+", " ", c.context.strip().lower())
            ctx_hash = hashlib.md5(ctx_norm.encode()).hexdigest()[:10]
            if ctx_hash not in seen_hashes:
                seen_hashes.add(ctx_hash)
                result.append(c)

    return result
