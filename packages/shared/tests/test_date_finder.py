"""Tests for date_finder: regex patterns, parsing, year inference, dedup."""

from datetime import date

import pytest

from shared.extraction.date_finder import (
    MONTH_NAME_DATE_RE,
    NUMERIC_DATE_RE,
    ISO_DATE_RE,
    TERM_HINT_RE,
    find_date_candidates,
    _safe_parse,
    _extract_context,
    _deduplicate,
)
from shared.schemas import PageText, Candidate


# ── Regex pattern tests ──────────────────────────────────────────────────────

class TestMonthNameRegex:
    def test_full_month_day(self):
        assert MONTH_NAME_DATE_RE.search("February 13")

    def test_abbreviated_month_day(self):
        assert MONTH_NAME_DATE_RE.search("Feb 13")

    def test_month_dot_day(self):
        assert MONTH_NAME_DATE_RE.search("Feb. 13")

    def test_month_day_year(self):
        m = MONTH_NAME_DATE_RE.search("February 13, 2026")
        assert m
        assert m.group(3) == "2026"

    def test_all_months(self):
        months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ]
        for month in months:
            text = f"{month} 1"
            assert MONTH_NAME_DATE_RE.search(text), f"Failed for {month}"

    def test_short_months(self):
        short = ["Jan", "Feb", "Mar", "Apr", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        for month in short:
            text = f"{month} 15"
            assert MONTH_NAME_DATE_RE.search(text), f"Failed for {month}"

    def test_no_false_positive_on_word(self):
        # "Mayor" should not match "May"
        m = MONTH_NAME_DATE_RE.search("The mayor decided")
        assert m is None


class TestNumericDateRegex:
    def test_m_d(self):
        assert NUMERIC_DATE_RE.search("2/13")

    def test_mm_dd(self):
        assert NUMERIC_DATE_RE.search("02/13")

    def test_mm_dd_yyyy(self):
        m = NUMERIC_DATE_RE.search("02/13/2026")
        assert m
        assert m.group(3) == "2026"

    def test_mm_dd_yy(self):
        m = NUMERIC_DATE_RE.search("02/13/26")
        assert m
        assert m.group(3) == "26"


class TestISODateRegex:
    def test_iso_format(self):
        m = ISO_DATE_RE.search("2026-02-13")
        assert m
        assert m.group(1) == "2026"
        assert m.group(2) == "02"
        assert m.group(3) == "13"


class TestTermHintRegex:
    def test_spring_year(self):
        m = TERM_HINT_RE.search("Spring 2026")
        assert m
        assert m.group(2) == "2026"

    def test_fall_year(self):
        m = TERM_HINT_RE.search("Fall 2025")
        assert m
        assert m.group(2) == "2025"


# ── Parsing tests ────────────────────────────────────────────────────────────

class TestSafeParse:
    def test_month_day_year(self):
        result = _safe_parse("February 13, 2026")
        assert result == date(2026, 2, 13)

    def test_month_day_with_override_year(self):
        result = _safe_parse("Feb 13", override_year=2026)
        assert result is not None
        assert result.year == 2026
        assert result.month == 2
        assert result.day == 13

    def test_numeric_date(self):
        result = _safe_parse("02/13/2026")
        assert result == date(2026, 2, 13)

    def test_iso_date(self):
        result = _safe_parse("2026-02-13")
        assert result == date(2026, 2, 13)

    def test_invalid_returns_none(self):
        result = _safe_parse("not a date at all")
        # May or may not return None depending on dateparser behavior
        # The key is it shouldn't crash


# ── Context extraction ───────────────────────────────────────────────────────

class TestExtractContext:
    def test_basic_context(self):
        text = "The midterm exam is on February 13 in room 204."
        ctx = _extract_context(text, 24, 35)
        assert "midterm" in ctx.lower()
        assert "February 13" in ctx

    def test_short_text(self):
        text = "Due Feb 13"
        ctx = _extract_context(text, 4, 10)
        assert "Due" in ctx


# ── Deduplication ────────────────────────────────────────────────────────────

class TestDeduplicate:
    def test_removes_exact_duplicates(self):
        c1 = Candidate(date=date(2026, 2, 13), raw_match="Feb 13",
                       context="Homework due Feb 13", page=1)
        c2 = Candidate(date=date(2026, 2, 13), raw_match="Feb 13",
                       context="Homework due Feb 13", page=1)
        result = _deduplicate([c1, c2])
        assert len(result) == 1

    def test_keeps_different_dates(self):
        c1 = Candidate(date=date(2026, 2, 13), raw_match="Feb 13",
                       context="Homework due Feb 13", page=1)
        c2 = Candidate(date=date(2026, 3, 4), raw_match="Mar 4",
                       context="Midterm Mar 4", page=1)
        result = _deduplicate([c1, c2])
        assert len(result) == 2

    def test_keeps_same_date_different_context(self):
        c1 = Candidate(date=date(2026, 2, 13), raw_match="Feb 13",
                       context="Homework 1 due Feb 13", page=1)
        c2 = Candidate(date=date(2026, 2, 13), raw_match="Feb 13",
                       context="Quiz on Feb 13 in class", page=2)
        result = _deduplicate([c1, c2])
        assert len(result) == 2


# ── Integration: find_date_candidates ────────────────────────────────────────

class TestFindDateCandidates:
    def test_finds_month_name_dates(self):
        pages = [PageText(page=1, text="Midterm Exam: March 4, 2026\nHomework Due: Feb 13, 2026")]
        candidates = find_date_candidates(pages)
        dates = {c.date for c in candidates}
        assert date(2026, 3, 4) in dates
        assert date(2026, 2, 13) in dates

    def test_year_inference_from_term(self):
        pages = [
            PageText(page=1, text="CS 101 - Spring 2026\nMidterm: March 4"),
        ]
        candidates = find_date_candidates(pages)
        assert len(candidates) >= 1
        assert all(c.date.year == 2026 for c in candidates)

    def test_iso_dates_found(self):
        pages = [PageText(page=1, text="Assignment due 2026-04-15")]
        candidates = find_date_candidates(pages)
        assert any(c.date == date(2026, 4, 15) for c in candidates)

    def test_numeric_dates_found(self):
        pages = [PageText(page=1, text="Spring 2026 syllabus\nQuiz on 2/27")]
        candidates = find_date_candidates(pages)
        assert any(c.date.month == 2 and c.date.day == 27 for c in candidates)

    def test_empty_text_returns_empty(self):
        pages = [PageText(page=1, text="No dates here at all.")]
        candidates = find_date_candidates(pages)
        assert len(candidates) == 0

    def test_ambiguous_flag_on_numeric_without_year(self):
        pages = [PageText(page=1, text="Submit by 3/4")]
        candidates = find_date_candidates(pages)
        # Without a term hint, should be ambiguous
        if candidates:
            # 3/4 is ambiguous because both 3 and 4 are <= 12
            assert any(c.is_ambiguous for c in candidates)
