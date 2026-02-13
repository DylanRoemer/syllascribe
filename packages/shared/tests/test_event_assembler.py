"""Tests for event_assembler: category classification, title extraction, confidence scoring."""

from datetime import date

import pytest

from shared.extraction.event_assembler import (
    assemble_events,
    _classify_category,
    _extract_title,
    _score_confidence,
)
from shared.schemas import Candidate


# ── Category classification ──────────────────────────────────────────────────

class TestClassifyCategory:
    def test_exam_keywords(self):
        assert _classify_category("The midterm exam is on this date") == "exam"
        assert _classify_category("Final Exam — May 6") == "exam"
        assert _classify_category("Quiz 1 in class") == "exam"

    def test_assignment_keywords(self):
        assert _classify_category("Homework 1 Due") == "assignment"
        assert _classify_category("Submit your essay by midnight") == "assignment"
        assert _classify_category("Project proposal due") == "assignment"

    def test_reading_keywords(self):
        assert _classify_category("Reading: Chapter 5") == "reading"
        assert _classify_category("Read pages 100-150") == "reading"

    def test_holiday_keywords(self):
        assert _classify_category("Spring Break - No Class") == "holiday"
        assert _classify_category("Holiday - campus closed") == "holiday"
        assert _classify_category("No class this week") == "holiday"

    def test_office_hours(self):
        assert _classify_category("Office hours cancelled") == "office_hours"

    def test_other_fallback(self):
        assert _classify_category("Some random text with a date") == "other"


# ── Title extraction ─────────────────────────────────────────────────────────

class TestExtractTitle:
    def test_extracts_title_around_date(self):
        context = "Midterm Exam — March 4"
        title = _extract_title(context, "March 4", "exam")
        assert "Midterm" in title or "Exam" in title

    def test_fallback_when_empty(self):
        context = "Feb 13"
        title = _extract_title(context, "Feb 13", "assignment")
        assert len(title) > 0
        assert "Assignment" in title or "Feb 13" in title

    def test_truncates_long_titles(self):
        context = "This is a very long course description that goes on and on " * 3 + " Mar 4"
        title = _extract_title(context, "Mar 4", "other")
        assert len(title) <= 83  # 80 + "..."


# ── Confidence scoring ───────────────────────────────────────────────────────

class TestScoreConfidence:
    def test_strong_exam_keyword_high_confidence(self):
        candidate = Candidate(
            date=date(2026, 3, 4), raw_match="March 4",
            context="MIDTERM EXAM on March 4, 2026", page=1,
        )
        score = _score_confidence(candidate.context, "exam", candidate)
        assert score >= 0.80

    def test_strong_assignment_keyword_high_confidence(self):
        candidate = Candidate(
            date=date(2026, 2, 13), raw_match="Feb 13",
            context="Homework 1 Due Feb 13", page=1,
        )
        score = _score_confidence(candidate.context, "assignment", candidate)
        assert score >= 0.80

    def test_weak_context_low_confidence(self):
        candidate = Candidate(
            date=date(2026, 4, 1), raw_match="Apr 1",
            context="Apr 1", page=1,
        )
        score = _score_confidence(candidate.context, "other", candidate)
        assert score < 0.60

    def test_ambiguous_penalized(self):
        candidate_clear = Candidate(
            date=date(2026, 2, 13), raw_match="Feb 13",
            context="Homework due Feb 13 in class", page=1,
        )
        candidate_ambig = Candidate(
            date=date(2026, 2, 13), raw_match="2/13",
            context="Homework due 2/13 in class", page=1,
            is_ambiguous=True,
        )
        score_clear = _score_confidence(candidate_clear.context, "assignment", candidate_clear)
        score_ambig = _score_confidence(candidate_ambig.context, "assignment", candidate_ambig)
        assert score_ambig < score_clear

    def test_confidence_always_in_range(self):
        candidate = Candidate(
            date=date(2026, 1, 1), raw_match="Jan 1",
            context="x", page=1, is_ambiguous=True, year_inferred=True,
        )
        score = _score_confidence("x", "other", candidate)
        assert 0.10 <= score <= 0.99


# ── Integration: assemble_events ─────────────────────────────────────────────

class TestAssembleEvents:
    def test_assembles_from_candidates(self):
        candidates = [
            Candidate(
                date=date(2026, 3, 4), raw_match="March 4",
                context="MIDTERM EXAM — March 4, 2026", page=1,
            ),
            Candidate(
                date=date(2026, 2, 13), raw_match="Feb 13",
                context="Homework 2 Due Feb 13", page=1,
            ),
        ]
        events = assemble_events(candidates)
        assert len(events) == 2
        assert all(e.date is not None for e in events)
        assert all(e.title for e in events)
        assert all(e.source_excerpt for e in events)

    def test_categories_assigned(self):
        candidates = [
            Candidate(
                date=date(2026, 3, 4), raw_match="March 4",
                context="MIDTERM EXAM — March 4", page=1,
            ),
            Candidate(
                date=date(2026, 3, 16), raw_match="March 16",
                context="Spring Break No Class March 16", page=1,
            ),
        ]
        events = assemble_events(candidates)
        categories = {e.category for e in events}
        assert "exam" in categories
        assert "holiday" in categories

    def test_empty_candidates_returns_empty(self):
        assert assemble_events([]) == []

    def test_all_events_are_all_day(self):
        candidates = [
            Candidate(date=date(2026, 5, 6), raw_match="May 6",
                      context="Final Exam May 6", page=1),
        ]
        events = assemble_events(candidates)
        assert all(e.all_day for e in events)
