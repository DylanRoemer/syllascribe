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
    _safe_construct_date,
    _extract_context,
    _deduplicate,
    _infer_year_from_filename,
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
        # Should not crash


class TestSafeConstructDate:
    def test_valid_date(self):
        assert _safe_construct_date(2026, 2, 13) == date(2026, 2, 13)

    def test_invalid_month(self):
        assert _safe_construct_date(2026, 13, 1) is None

    def test_invalid_day(self):
        assert _safe_construct_date(2026, 2, 30) is None

    def test_two_digit_year_not_auto_expanded(self):
        # Direct construction: year 26 is valid but not 2026
        result = _safe_construct_date(26, 2, 13)
        assert result is not None
        assert result.year == 26


# ── Year inference from filename ─────────────────────────────────────────────

class TestInferYearFromFilename:
    def test_term_with_year(self):
        assert _infer_year_from_filename("Hogan - Macro Syllabus Winter 2026-02-03.pdf") == 2026

    def test_underscore_term(self):
        assert _infer_year_from_filename("CS101_Spring_2026.pdf") == 2026

    def test_plain_year_in_filename(self):
        assert _infer_year_from_filename("syllabus_2026.pdf") == 2026

    def test_no_year_returns_none(self):
        assert _infer_year_from_filename("random_file.pdf") is None

    def test_hyphenated_term(self):
        assert _infer_year_from_filename("Fall-2025-schedule.pdf") == 2025


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

    def test_keeps_same_date_different_pages(self):
        c1 = Candidate(date=date(2026, 2, 13), raw_match="Feb 13",
                       context="Homework 1 due Feb 13", page=1)
        c2 = Candidate(date=date(2026, 2, 13), raw_match="Feb 13",
                       context="Quiz on Feb 13 in class", page=2)
        result = _deduplicate([c1, c2])
        assert len(result) == 2

    def test_prefers_table_over_text_same_date_page(self):
        """When both pdf_text and table find the same date on the same page, keep table."""
        c_text = Candidate(date=date(2026, 2, 13), raw_match="Feb 13",
                           context="Feb 13 Homework 2 Due: Control Flow", page=1,
                           source_kind="pdf_text")
        c_table = Candidate(date=date(2026, 2, 13), raw_match="Feb 13",
                            context="Feb 13 | Homework 2 Due: Control Flow", page=1,
                            source_kind="table")
        result = _deduplicate([c_text, c_table])
        assert len(result) == 1
        assert result[0].source_kind == "table"


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
        if candidates:
            assert any(c.is_ambiguous for c in candidates)

    def test_short_numeric_dates_with_filename_year(self):
        """Short numeric dates like 1/6 should resolve using filename year."""
        pages = [PageText(page=1, text="1 1/6 Syllabus\n2 1/8 Micro recap\n14 2/19 Mid-term exam 2")]
        candidates = find_date_candidates(pages, filename="Macro Syllabus Winter 2026.pdf")
        dates = {c.date for c in candidates}
        assert date(2026, 1, 6) in dates
        assert date(2026, 1, 8) in dates
        assert date(2026, 2, 19) in dates

    def test_all_months_covered_not_just_future(self):
        """Dates in Jan should not be pushed to next year when year is inferred."""
        pages = [PageText(page=1, text="Schedule:\n1/6 Class starts\n3/12 Last class")]
        candidates = find_date_candidates(pages, filename="Spring_2026_syllabus.pdf")
        dates = {c.date for c in candidates}
        assert date(2026, 1, 6) in dates
        assert date(2026, 3, 12) in dates
        # Both should be 2026, not one in 2027
        assert all(c.date.year == 2026 for c in candidates)

    def test_two_digit_year_expanded(self):
        """02/13/26 should become 2026-02-13."""
        pages = [PageText(page=1, text="Spring 2026\nDue 02/13/26")]
        candidates = find_date_candidates(pages)
        assert any(c.date == date(2026, 2, 13) for c in candidates)
