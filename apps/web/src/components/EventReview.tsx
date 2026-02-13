"use client";

import { useState, useCallback, useRef } from "react";
import { EventRow } from "./EventRow";
import { NeedsAttention } from "./NeedsAttention";
import { ExportPanel } from "./ExportPanel";
import type {
  EventResponse,
  EventsListResponse,
  NeedsAttention as NeedsAttentionType,
} from "@/lib/api";
import { updateEvents } from "@/lib/api";
import { format, parseISO } from "date-fns";

interface Props {
  jobId: string;
  data: EventsListResponse;
  onRefresh: () => void;
}

interface EditState {
  title: string;
  date: string;
  category: string;
  deleted: boolean;
}

export function EventReview({ jobId, data, onRefresh }: Props) {
  const [edits, setEdits] = useState<Record<string, EditState>>(() => {
    const initial: Record<string, EditState> = {};
    for (const ev of data.events) {
      initial[ev.id] = {
        title: ev.title,
        date: ev.date,
        category: ev.category,
        deleted: false,
      };
    }
    return initial;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const flaggedRef = useRef<HTMLDivElement | null>(null);

  const handleChange = useCallback(
    (eventId: string, field: string, value: string | boolean) => {
      setEdits((prev) => ({
        ...prev,
        [eventId]: { ...prev[eventId], [field]: value },
      }));
      setSaveMessage(null);
    },
    []
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const updates = data.events.map((ev) => {
        const edit = edits[ev.id];
        return {
          id: ev.id,
          title: edit.title !== ev.title ? edit.title : undefined,
          date: edit.date !== ev.date ? edit.date : undefined,
          category: edit.category !== ev.category ? edit.category : undefined,
          delete: edit.deleted,
        };
      });

      // Only send events that have actual changes
      const changed = updates.filter(
        (u) => u.title !== undefined || u.date !== undefined || u.category !== undefined || u.delete
      );

      if (changed.length === 0) {
        setSaveMessage("No changes to save.");
        setIsSaving(false);
        return;
      }

      const result = await updateEvents(jobId, changed);
      setSaveMessage(
        `Saved: ${result.updated} updated, ${result.deleted} deleted.`
      );
      onRefresh();
    } catch {
      setSaveMessage("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [data.events, edits, jobId, onRefresh]);

  const scrollToFirstFlagged = useCallback(() => {
    flaggedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Group events by date
  const grouped = groupByDate(data.events);
  let firstFlaggedAssigned = false;

  return (
    <div>
      <NeedsAttention
        attention={data.needs_attention}
        onScrollToFirst={scrollToFirstFlagged}
      />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Extracted Events ({data.events.length})
        </h2>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className="text-sm text-gray-600">{saveMessage}</span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="space-y-6 mb-8">
        {Object.entries(grouped).map(([dateStr, events]) => (
          <div key={dateStr}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {formatDateHeading(dateStr)}
            </h3>
            <div className="space-y-3">
              {events.map((event) => {
                const needsFlag =
                  event.is_ambiguous || event.confidence < 0.6;
                const isFirstFlagged = needsFlag && !firstFlaggedAssigned;
                if (isFirstFlagged) firstFlaggedAssigned = true;

                return (
                  <EventRow
                    key={event.id}
                    event={event}
                    editState={edits[event.id]}
                    onChange={(field, value) =>
                      handleChange(event.id, field, value)
                    }
                    flagRef={
                      isFirstFlagged
                        ? (el) => {
                            flaggedRef.current = el;
                          }
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ExportPanel jobId={jobId} eventCount={data.events.length} />
    </div>
  );
}

function groupByDate(
  events: EventResponse[]
): Record<string, EventResponse[]> {
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
