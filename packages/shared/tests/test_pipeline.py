"""Integration test: extract dates from synthetic syllabus fixture."""

import os
from datetime import date

import pytest

from shared.extraction.text_extractor import extract_text
from shared.extraction.date_finder import find_date_candidates
from shared.extraction.event_assembler import assemble_events
from shared.ics_generator import generate_ics


FIXTURE_DIR = os.path.join(os.path.dirname(__file__), "..", "fixtures")
SYLLABUS_PATH = os.path.join(FIXTURE_DIR, "synthetic_syllabus.pdf")


@pytest.mark.skipif(
    not os.path.exists(SYLLABUS_PATH),
    reason="Fixture PDF not generated yet. Run: python packages/shared/fixtures/generate_fixtures.py",
)
class TestFullPipeline:
    def test_extract_text_returns_pages(self):
        pages = extract_text(SYLLABUS_PATH)
        assert len(pages) > 0
        total_text = " ".join(p.text for p in pages)
        assert "CS 101" in total_text or "Introduction" in total_text

    def test_find_candidates_returns_dates(self):
        pages = extract_text(SYLLABUS_PATH)
        candidates = find_date_candidates(pages)
        assert len(candidates) >= 5, f"Expected >= 5 candidates, got {len(candidates)}"

    def test_candidates_include_key_dates(self):
        pages = extract_text(SYLLABUS_PATH)
        candidates = find_date_candidates(pages)
        dates = {c.date for c in candidates}
        # The fixture contains these known dates
        assert date(2026, 3, 4) in dates, "Midterm date not found"
        assert date(2026, 5, 6) in dates, "Final exam date not found"

    def test_assemble_events_from_fixture(self):
        pages = extract_text(SYLLABUS_PATH)
        candidates = find_date_candidates(pages)
        events = assemble_events(candidates)
        assert len(events) >= 5, f"Expected >= 5 events, got {len(events)}"

        # Check that some events have meaningful categories
        categories = {e.category for e in events}
        assert "exam" in categories, "No exam events found"

    def test_events_have_source_evidence(self):
        pages = extract_text(SYLLABUS_PATH)
        candidates = find_date_candidates(pages)
        events = assemble_events(candidates)
        for event in events:
            assert event.source_excerpt, f"Event '{event.title}' has no source excerpt"
            assert event.source_page is not None, f"Event '{event.title}' has no source page"

    def test_ics_generation_from_fixture(self):
        pages = extract_text(SYLLABUS_PATH)
        candidates = find_date_candidates(pages)
        events = assemble_events(candidates)
        ics_bytes = generate_ics(events)

        ics_text = ics_bytes.decode("utf-8")
        assert "BEGIN:VCALENDAR" in ics_text
        assert "BEGIN:VEVENT" in ics_text
        assert "DTSTART;VALUE=DATE:" in ics_text
        # Should have at least 5 events
        assert ics_text.count("BEGIN:VEVENT") >= 5

    def test_no_events_without_grounding(self):
        """Every event must trace back to an explicit date in the text."""
        pages = extract_text(SYLLABUS_PATH)
        candidates = find_date_candidates(pages)
        events = assemble_events(candidates)
        # events should not exceed candidates (no invention)
        assert len(events) <= len(candidates)
