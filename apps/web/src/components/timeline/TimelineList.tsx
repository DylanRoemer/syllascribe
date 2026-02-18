"use client";

import { useCallback } from "react";
import { format, parseISO } from "date-fns";
import type { EventResponse } from "@/lib/api";
import { TimelineRow } from "./TimelineRow";

interface Props {
  events: EventResponse[];
  selectedId: string | null;
  selectedIds?: Set<string>;
  deletedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleSelect?: (id: string) => void;
  multiSelectMode?: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  setDateGroupRef: (date: string, el: HTMLDivElement | null) => void;
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
    return format(parseISO(dateStr), "EEEE, MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function formatShortDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MMM d");
  } catch {
    return dateStr;
  }
}

export function TimelineList({
  events,
  selectedId,
  selectedIds,
  deletedIds,
  onSelect,
  onToggleSelect,
  multiSelectMode = false,
  scrollContainerRef,
  setDateGroupRef,
}: Props) {
  const isSelected = useCallback((id: string) => {
    if (multiSelectMode && selectedIds?.size) return selectedIds.has(id);
    return selectedId === id;
  }, [multiSelectMode, selectedIds, selectedId]);
  const grouped = groupByDate(events);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-surface-500 dark:text-surface-400">
          No events match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      role="listbox"
      aria-label="Extracted events timeline"
      className="h-full overflow-y-auto custom-scrollbar timeline-line space-y-6"
    >
      {Object.entries(grouped).map(([dateStr, dateEvents]) => (
        <div
          key={dateStr}
          ref={(el) => setDateGroupRef(dateStr, el)}
          data-date={dateStr}
        >
          <div className="sticky top-0 z-10 flex items-center gap-3 pl-[14px] pb-2 pt-1 bg-surface-50/95 dark:bg-surface-900/95 backdrop-blur-sm">
            <div className="h-3 w-3 rounded-full bg-primary-500 ring-4 ring-surface-50 dark:ring-surface-900 relative z-10" />
            <div>
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
                {formatDateHeading(dateStr)}
              </h3>
              <p className="text-[11px] text-surface-400 dark:text-surface-500 tabular-nums">
                {formatShortDate(dateStr)} · {dateEvents.length} event{dateEvents.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="space-y-2 pl-10">
            {dateEvents.map((event) => (
              <TimelineRow
                key={event.id}
                event={event}
                isSelected={isSelected(event.id)}
                isDeleted={deletedIds.has(event.id)}
                onSelect={() => onSelect(event.id)}
                onToggleSelect={onToggleSelect ? () => onToggleSelect(event.id) : undefined}
                showCheckbox={multiSelectMode}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
