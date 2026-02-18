"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { EventResponse, EventsListResponse } from "@/lib/api";
import { updateEvents } from "@/lib/api";
import { useAutosave } from "@/lib/useAutosave";
import { TimelineEventList } from "./TimelineEventList";
import { InspectorPanel, type FilterType, type SortType } from "./InspectorPanel";
import { ExportModal } from "./ExportModal";
import { MobileBottomSheet } from "./MobileBottomSheet";

interface Props {
  jobId: string;
  data: EventsListResponse;
  filename: string;
  onRefresh: () => void;
}

interface EditState {
  title: string;
  date: string;
  category: string;
  description: string;
  deleted: boolean;
}

export function EventReview({ jobId, data, filename, onRefresh }: Props) {
  // ── Selection state ──────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // ── Edit state (per-event) ───────────────────────────────────────────
  const [edits, setEdits] = useState<Record<string, EditState>>(() => {
    const initial: Record<string, EditState> = {};
    for (const ev of data.events) {
      initial[ev.id] = {
        title: ev.title,
        date: ev.date,
        category: ev.category,
        description: ev.description ?? "",
        deleted: false,
      };
    }
    return initial;
  });

  // ── Saving state ─────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // ── Filter + sort ────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [activeSort, setActiveSort] = useState<SortType>("date");

  // ── Export modal ─────────────────────────────────────────────────────
  const [exportOpen, setExportOpen] = useState(false);

  // ── Bulk actions state ───────────────────────────────────────────────
  const [bulkCategory, setBulkCategory] = useState("assignment");
  const [courseTag, setCourseTag] = useState("");

  // ── Derived data ─────────────────────────────────────────────────────
  const deletedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [id, edit] of Object.entries(edits)) {
      if (edit.deleted) ids.add(id);
    }
    return ids;
  }, [edits]);

  const filteredEvents = useMemo(() => {
    let events = data.events;

    // Apply filter
    if (activeFilter === "needs_attention") {
      events = events.filter((e) => e.is_ambiguous || e.confidence < 0.6);
    } else if (activeFilter !== "all") {
      events = events.filter((e) => e.category === activeFilter);
    }

    // Apply sort
    if (activeSort === "confidence") {
      events = [...events].sort((a, b) => a.confidence - b.confidence);
    }
    // "date" sort is default from API

    return events;
  }, [data.events, activeFilter, activeSort]);

  const selectedEvents = useMemo(
    () => data.events.filter((e) => selectedIds.has(e.id)),
    [data.events, selectedIds]
  );

  const currentEditState = useMemo(() => {
    if (selectedEvents.length === 1) {
      return edits[selectedEvents[0].id] ?? null;
    }
    return null;
  }, [selectedEvents, edits]);

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleSelect = useCallback((id: string) => {
    if (multiSelectMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        if (prev.size === 1 && prev.has(id)) return new Set();
        return new Set([id]);
      });
    }
  }, [multiSelectMode]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size > 1) setMultiSelectMode(true);
      return next;
    });
  }, []);

  const handleEditChange = useCallback((field: string, value: string | boolean) => {
    if (selectedEvents.length !== 1) return;
    const id = selectedEvents[0].id;
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
    setSaveStatus("idle");
  }, [selectedEvents]);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const updates = data.events.map((ev) => {
        const edit = edits[ev.id];
        return {
          id: ev.id,
          title: edit.title !== ev.title ? edit.title : undefined,
          date: edit.date !== ev.date ? edit.date : undefined,
          category: edit.category !== ev.category ? edit.category : undefined,
          description: edit.description !== (ev.description ?? "") ? edit.description : undefined,
          delete: edit.deleted,
        };
      });

      const changed = updates.filter(
        (u) => u.title !== undefined || u.date !== undefined || u.category !== undefined || u.description !== undefined || u.delete
      );

      if (changed.length === 0) {
        toast.info("No changes to save.");
        setSaveStatus("idle");
        return;
      }

      const result = await updateEvents(jobId, changed);
      setSaveStatus("saved");
      toast.success(`Saved: ${result.updated} updated, ${result.deleted} removed.`);
      onRefresh();
    } catch {
      setSaveStatus("error");
      toast.error("Couldn't save changes. Please retry.");
    }
  }, [data.events, edits, jobId, onRefresh]);

  // Autosave: debounced save after edits
  useAutosave(handleSave, [edits], 1200, saveStatus === "idle");

  const handleAcceptHighConfidence = useCallback(() => {
    setActiveFilter("needs_attention");
    toast.info("Showing only events that need review.");
  }, []);

  // ── Bulk actions ─────────────────────────────────────────────────────
  const handleBulkApplyCategory = useCallback(() => {
    setEdits((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        if (next[id]) next[id] = { ...next[id], category: bulkCategory };
      }
      return next;
    });
    toast.success(`Category set to "${bulkCategory.replace("_", " ")}" for ${selectedIds.size} events.`);
    setSaveStatus("idle");
  }, [selectedIds, bulkCategory]);

  const handleBulkPrependTag = useCallback(() => {
    if (!courseTag.trim()) return;
    const tag = courseTag.trim();
    setEdits((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        if (next[id] && !next[id].title.startsWith(tag)) {
          next[id] = { ...next[id], title: `${tag} ${next[id].title}` };
        }
      }
      return next;
    });
    toast.success(`Tag "${tag}" prepended to ${selectedIds.size} events.`);
    setSaveStatus("idle");
  }, [selectedIds, courseTag]);

  const handleBulkDelete = useCallback(() => {
    setEdits((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        if (next[id]) next[id] = { ...next[id], deleted: true };
      }
      return next;
    });
    setSelectedIds(new Set());
    setSaveStatus("idle");
  }, [selectedIds]);

  const handleBulkInclude = useCallback(() => {
    setEdits((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        if (next[id]) next[id] = { ...next[id], deleted: false };
      }
      return next;
    });
    setSaveStatus("idle");
  }, [selectedIds]);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Top Action Bar ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-xl font-semibold text-surface-900 dark:text-surface-100">
            {data.events.length} Events Extracted
          </h2>
          {saveStatus === "saving" && (
            <span className="text-xs text-surface-400 dark:text-surface-500" aria-live="polite">
              Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400" aria-live="polite">
              Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs text-red-600 dark:text-red-400" aria-live="polite">
              Couldn&apos;t save — retry
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {multiSelectMode ? (
            <button
              onClick={() => {
                setMultiSelectMode(false);
                setSelectedIds(new Set());
              }}
              className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-xs font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors focus-ring"
            >
              Cancel selection
            </button>
          ) : (
            <button
              onClick={() => setMultiSelectMode(true)}
              className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-xs font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors focus-ring"
            >
              Select multiple
            </button>
          )}

          <button
            onClick={handleAcceptHighConfidence}
            className="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-xs font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors focus-ring"
          >
            Show needs attention
          </button>

          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-60 focus-ring"
          >
            {saveStatus === "saving" ? "Saving..." : "Save changes"}
          </button>

          <button
            onClick={() => setExportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface-900 dark:bg-surface-100 px-4 py-1.5 text-xs font-medium text-white dark:text-surface-900 hover:bg-surface-800 dark:hover:bg-surface-200 transition-colors focus-ring"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download .ics
          </button>
        </div>
      </div>

      {/* ── Split View (desktop) / Single Column (mobile) ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left: Timeline */}
        <div className="min-h-[400px] max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar pr-1">
          <TimelineEventList
            events={filteredEvents}
            selectedIds={selectedIds}
            deletedIds={deletedIds}
            onSelect={handleSelect}
            onToggleSelect={handleToggleSelect}
            multiSelectMode={multiSelectMode}
          />
        </div>

        {/* Right: Inspector (desktop only) */}
        <aside className="hidden lg:block sticky top-20 self-start max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar rounded-xl border border-surface-200 dark:border-surface-700 surface-card p-5">
          <InspectorPanel
            selectedEvents={selectedEvents}
            editState={currentEditState}
            onEditChange={handleEditChange}
            attention={data.needs_attention}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            activeSort={activeSort}
            onSortChange={setActiveSort}
            bulkCategory={bulkCategory}
            onBulkCategoryChange={setBulkCategory}
            onBulkApplyCategory={handleBulkApplyCategory}
            courseTag={courseTag}
            onCourseTagChange={setCourseTag}
            onBulkPrependTag={handleBulkPrependTag}
            onBulkDelete={handleBulkDelete}
            onBulkInclude={handleBulkInclude}
          />
        </aside>
      </div>

      {/* ── Mobile Bottom Sheet ──────────────────────────────────────── */}
      <div className="lg:hidden">
        <MobileBottomSheet
          isOpen={selectedEvents.length > 0}
          onClose={() => setSelectedIds(new Set())}
        >
          <InspectorPanel
            selectedEvents={selectedEvents}
            editState={currentEditState}
            onEditChange={handleEditChange}
            attention={data.needs_attention}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            activeSort={activeSort}
            onSortChange={setActiveSort}
            bulkCategory={bulkCategory}
            onBulkCategoryChange={setBulkCategory}
            onBulkApplyCategory={handleBulkApplyCategory}
            courseTag={courseTag}
            onCourseTagChange={setCourseTag}
            onBulkPrependTag={handleBulkPrependTag}
            onBulkDelete={handleBulkDelete}
            onBulkInclude={handleBulkInclude}
          />
        </MobileBottomSheet>

        {/* Mobile sticky bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-surface-200 dark:border-surface-700 bg-white/90 dark:bg-surface-900/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-surface-600 dark:text-surface-300">
            {selectedIds.size > 0 && (
              <span>{selectedIds.size} selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-60 focus-ring"
            >
              Save
            </button>
            <button
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface-900 dark:bg-surface-100 px-3 py-1.5 text-xs font-medium text-white dark:text-surface-900 hover:bg-surface-800 dark:hover:bg-surface-200 transition-colors focus-ring"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              .ics
            </button>
          </div>
        </div>
      </div>

      {/* ── Export Modal ──────────────────────────────────────────────── */}
      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        jobId={jobId}
        filename={filename}
      />
    </div>
  );
}
