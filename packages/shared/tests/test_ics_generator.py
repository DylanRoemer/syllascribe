"""Tests for ICS generator: valid output, VALUE=DATE format, stable UIDs."""

import uuid
from datetime import date
from dataclasses import dataclass, field
from typing import Optional

import pytest

from shared.ics_generator import generate_ics


@dataclass
class MockEvent:
    """Mock event matching the EventRecord protocol."""
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    title: str = "Test Event"
    description: Optional[str] = None
    date: date = field(default_factory=lambda: date(2026, 3, 4))
    source_page: Optional[int] = None
    category: str = "other"


class TestGenerateICS:
    def test_returns_bytes(self):
        events = [MockEvent()]
        result = generate_ics(events)
        assert isinstance(result, bytes)

    def test_valid_ical_structure(self):
        events = [MockEvent(title="Midterm Exam")]
        result = generate_ics(events).decode("utf-8")
        assert "BEGIN:VCALENDAR" in result
        assert "END:VCALENDAR" in result
        assert "BEGIN:VEVENT" in result
        assert "END:VEVENT" in result

    def test_prodid_and_version(self):
        events = [MockEvent()]
        result = generate_ics(events).decode("utf-8")
        assert "PRODID:-//Syllascribe//EN" in result
        assert "VERSION:2.0" in result

    def test_dtstart_value_date_format(self):
        """All-day events must use VALUE=DATE (no time component)."""
        events = [MockEvent(date=date(2026, 3, 4))]
        result = generate_ics(events).decode("utf-8")
        assert "DTSTART;VALUE=DATE:20260304" in result

    def test_summary_present(self):
        events = [MockEvent(title="Final Exam")]
        result = generate_ics(events).decode("utf-8")
        assert "SUMMARY:Final Exam" in result

    def test_stable_uid(self):
        event_id = uuid.UUID("12345678-1234-1234-1234-123456789abc")
        events = [MockEvent(id=event_id)]
        result = generate_ics(events).decode("utf-8")
        assert f"UID:{event_id}@syllascribe.local" in result

    def test_description_with_source_page(self):
        events = [MockEvent(description="Important exam", source_page=3)]
        result = generate_ics(events).decode("utf-8")
        assert "Important exam" in result
        assert "Source: page 3" in result

    def test_description_without_source_page(self):
        events = [MockEvent(description="Just a description", source_page=None)]
        result = generate_ics(events).decode("utf-8")
        assert "Just a description" in result
        assert "Source:" not in result

    def test_no_description_no_crash(self):
        events = [MockEvent(description=None, source_page=None)]
        result = generate_ics(events)
        assert b"BEGIN:VEVENT" in result

    def test_multiple_events(self):
        events = [
            MockEvent(title="Midterm", date=date(2026, 3, 4)),
            MockEvent(title="Final", date=date(2026, 5, 6)),
            MockEvent(title="HW 1 Due", date=date(2026, 2, 13)),
        ]
        result = generate_ics(events).decode("utf-8")
        assert result.count("BEGIN:VEVENT") == 3
        assert "SUMMARY:Midterm" in result
        assert "SUMMARY:Final" in result
        assert "SUMMARY:HW 1 Due" in result

    def test_empty_events(self):
        result = generate_ics([])
        text = result.decode("utf-8")
        assert "BEGIN:VCALENDAR" in text
        assert "BEGIN:VEVENT" not in text

    def test_category_present(self):
        events = [MockEvent(category="exam")]
        result = generate_ics(events).decode("utf-8")
        assert "CATEGORIES:exam" in result
