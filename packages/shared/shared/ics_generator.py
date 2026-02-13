"""ICS calendar file generation using the icalendar library.

Generates VCALENDAR with all-day VEVENT components (VALUE=DATE).
"""

from __future__ import annotations

from datetime import date
from typing import Any, Protocol, runtime_checkable

from icalendar import Calendar, Event as IcsEvent


@runtime_checkable
class EventRecord(Protocol):
    """Protocol for event objects passed to the generator.

    Compatible with both SQLAlchemy Event model and Pydantic EventDraft.
    """
    id: Any
    title: str
    description: str | None
    date: date
    source_page: int | None


def generate_ics(events: list[Any]) -> bytes:
    """Generate an ICS calendar file from a list of event records.

    Args:
        events: List of objects with id, title, description, date, source_page attributes.

    Returns:
        Raw bytes of the .ics file content.
    """
    cal = Calendar()
    cal.add("prodid", "-//Syllascribe//EN")
    cal.add("version", "2.0")
    cal.add("calscale", "GREGORIAN")
    cal.add("method", "PUBLISH")
    cal.add("x-wr-calname", "Syllascribe Calendar")

    for ev in events:
        ics_event = IcsEvent()

        # Stable UID
        uid = f"{ev.id}@syllascribe.local"
        ics_event.add("uid", uid)

        # All-day event: DTSTART;VALUE=DATE
        ics_event.add("dtstart", ev.date)

        # Summary (title)
        ics_event.add("summary", ev.title)

        # Description with source reference
        desc_parts: list[str] = []
        if getattr(ev, "description", None):
            desc_parts.append(ev.description)
        if getattr(ev, "source_page", None) is not None:
            desc_parts.append(f"Source: page {ev.source_page}")
        if desc_parts:
            ics_event.add("description", "\n".join(desc_parts))

        # Category
        category = getattr(ev, "category", None)
        if category:
            ics_event.add("categories", [category])

        cal.add_component(ics_event)

    return cal.to_ical()
