"use client";

import { format, parseISO } from "date-fns";
import type { EventResponse } from "@/lib/api";
import { TimelineEventRow } from "./TimelineEventRow";

interface Props {
  events: EventResponse[];
  selectedIds: Set<string>;
  deletedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleSelect: (id: string) => void;
  multiSelectMode: boolean;
}

function groupByDate(events: EventResponse[]): Record<string, EventResponse[]> {
  const groups: Record<string, EventResponse[]> = {};
  for (const ev of events) {
    if (!groups[ev.date]) groups[ev.date] = [];
    groups[ev.date].push(ev);
  }
  return groups;
}

function formatDateHeading(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    return format(d, "EEEE, MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function formatShortDate(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    return format(d, "MMM d");
  } catch {
    return dateStr;
  }
}

export function TimelineEventList({
  events,
  selectedIds,
  deletedIds,
  onSelect,
  onToggleSelect,
  multiSelectMode,
}: Props) {
  const grouped = groupByDate(events);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg className="h-12 w-12 text-surface-300 dark:text-surface-600 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          No events match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div role="listbox" aria-label="Extracted events timeline" className="timeline-line space-y-6 custom-scrollbar">
      {Object.entries(grouped).map(([dateStr, dateEvents]) => (
        <div key={dateStr}>
          {/* Sticky date header */}
          <div className="sticky top-0 z-10 flex items-center gap-3 pl-[14px] pb-2 pt-1 bg-surface-50/90 dark:bg-surface-900/90 backdrop-blur-sm">
            <div className="h-3 w-3 rounded-full bg-primary-500 ring-4 ring-surface-50 dark:ring-surface-900 relative z-10" />
            <div>
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
                {formatDateHeading(dateStr)}
              </h3>
              <p className="text-[11px] text-surface-400 dark:text-surface-500 tabular-nums">
                {formatShortDate(dateStr)} &middot; {dateEvents.length} event{dateEvents.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Events for this date */}
          <div className="space-y-2 pl-10">
            {dateEvents.map((event) => (
              <TimelineEventRow
                key={event.id}
                event={event}
                isSelected={selectedIds.has(event.id)}
                isDeleted={deletedIds.has(event.id)}
                onSelect={() => onSelect(event.id)}
                onToggleSelect={() => onToggleSelect(event.id)}
                showCheckbox={multiSelectMode}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
