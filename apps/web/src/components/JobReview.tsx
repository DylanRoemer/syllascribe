"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";
import type { EventResponse, EventsListResponse } from "@/lib/api";
import { updateEvents } from "@/lib/api";
import { useSelectionQueryParam } from "@/hooks/useSelectionQueryParam";
import { useScrollSpyDateGroups } from "@/hooks/useScrollSpyDateGroups";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { JobReviewShell } from "@/components/layout/JobReviewShell";
import { DateNavigator } from "@/components/calendar/DateNavigator";
import { TimelineList } from "@/components/timeline/TimelineList";
import { InspectorPanel, type FilterType, type SortType } from "@/components/inspector/InspectorPanel";
import { ExportDialog } from "@/components/export/ExportDialog";

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

export function JobReview({ jobId, data, filename, onRefresh }: Props) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [selectedId, setSelectedId] = useSelectionQueryParam();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [activeSort, setActiveSort] = useState<SortType>("date");
  const [exportOpen, setExportOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("assignment");
  const [courseTag, setCourseTag] = useState("");

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

  const deletedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [id, edit] of Object.entries(edits)) {
      if (edit.deleted) ids.add(id);
    }
    return ids;
  }, [edits]);

  const filteredEvents = useMemo(() => {
    let events = data.events;
    if (activeFilter === "needs_attention") {
      events = events.filter((e) => e.is_ambiguous || e.confidence < 0.6);
    } else if (activeFilter !== "all") {
      events = events.filter((e) => e.category === activeFilter);
    }
    if (activeSort === "confidence") {
      events = [...events].sort((a, b) => a.confidence - b.confidence);
    }
    return events;
  }, [data.events, activeFilter, activeSort]);

  const dateKeys = useMemo(() => [...new Set(filteredEvents.map((e) => e.date))].sort(), [filteredEvents]);
  const { scrollContainerRef, setDateGroupRef, inViewDate, scrollToDate } = useScrollSpyDateGroups(dateKeys);

  const needsAttentionEvents = useMemo(
    () => filteredEvents.filter((e) => e.is_ambiguous || e.confidence < 0.6),
    [filteredEvents]
  );
  const needsAttentionIds = useMemo(() => needsAttentionEvents.map((e) => e.id), [needsAttentionEvents]);
  const currentIssueIndex = selectedId ? needsAttentionIds.indexOf(selectedId) : -1;
  const hasNextIssue = currentIssueIndex >= 0 && currentIssueIndex < needsAttentionIds.length - 1;
  const hasPrevIssue = currentIssueIndex > 0;

  const selectedEvent = selectedId ? data.events.find((e) => e.id === selectedId) : null;
  const selectedEvents = useMemo(() => {
    if (multiSelectMode && selectedIds.size > 0) {
      return data.events.filter((e) => selectedIds.has(e.id));
    }
    if (selectedEvent) return [selectedEvent];
    return [];
  }, [data.events, selectedId, selectedEvent, multiSelectMode, selectedIds]);

  const currentEditState = selectedEvents.length === 1 ? edits[selectedEvents[0].id] ?? null : null;

  useEffect(() => {
    if (selectedId && !data.events.some((e) => e.id === selectedId)) {
      setSelectedId(null);
    }
  }, [selectedId, data.events, setSelectedId]);

  const handleSelect = useCallback(
    (id: string) => {
      if (multiSelectMode) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      } else {
        setSelectedId(id);
      }
    },
    [multiSelectMode, setSelectedId]
  );

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleEditChange = useCallback((field: string, value: string | boolean) => {
    if (selectedEvents.length !== 1) return;
    const id = selectedEvents[0].id;
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
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
      const changed = updates.filter((u) => u.title !== undefined || u.date !== undefined || u.category !== undefined || u.description !== undefined || u.delete);
      if (changed.length === 0) {
        toast.info("No changes to save.");
        setSaveStatus("idle");
        return;
      }
      await updateEvents(jobId, changed);
      setSaveStatus("saved");
      toast.success("Changes saved.");
      onRefresh();
    } catch {
      setSaveStatus("error");
      toast.error("Couldn't save. Please retry.");
    }
  }, [data.events, edits, jobId, onRefresh]);

  const handleReviewAmbiguous = useCallback(() => {
    setActiveFilter("needs_attention");
    const first = needsAttentionEvents[0];
    if (first) {
      setSelectedId(first.id);
      scrollToDate(first.date);
    }
  }, [needsAttentionEvents, setSelectedId, scrollToDate]);

  const handleReviewLowConfidence = useCallback(() => {
    setActiveFilter("needs_attention");
    const first = needsAttentionEvents[0];
    if (first) {
      setSelectedId(first.id);
      scrollToDate(first.date);
    }
  }, [needsAttentionEvents, setSelectedId, scrollToDate]);

  const handleNextIssue = useCallback(() => {
    if (!hasNextIssue) return;
    const nextId = needsAttentionIds[currentIssueIndex + 1];
    const ev = data.events.find((e) => e.id === nextId);
    if (ev) {
      setSelectedId(nextId);
      scrollToDate(ev.date);
    }
  }, [hasNextIssue, currentIssueIndex, needsAttentionIds, data.events, setSelectedId, scrollToDate]);

  const handlePrevIssue = useCallback(() => {
    if (!hasPrevIssue) return;
    const prevId = needsAttentionIds[currentIssueIndex - 1];
    const ev = data.events.find((e) => e.id === prevId);
    if (ev) {
      setSelectedId(prevId);
      scrollToDate(ev.date);
    }
  }, [hasPrevIssue, currentIssueIndex, needsAttentionIds, data.events, setSelectedId, scrollToDate]);

  const handleBulkApplyCategory = useCallback(() => {
    setEdits((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        if (next[id]) next[id] = { ...next[id], category: bulkCategory };
      });
      return next;
    });
    setSaveStatus("idle");
  }, [selectedIds, bulkCategory]);

  const handleBulkPrependTag = useCallback(() => {
    if (!courseTag.trim()) return;
    const tag = courseTag.trim();
    setEdits((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        if (next[id] && !next[id].title.startsWith(tag)) next[id] = { ...next[id], title: `${tag} ${next[id].title}` };
      });
      return next;
    });
    setSaveStatus("idle");
  }, [selectedIds, courseTag]);

  const handleBulkDelete = useCallback(() => {
    setEdits((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        if (next[id]) next[id] = { ...next[id], deleted: true };
      });
      return next;
    });
    setSelectedIds(new Set());
    setSelectedId(null);
    setSaveStatus("idle");
  }, [selectedIds, setSelectedId]);

  const handleBulkInclude = useCallback(() => {
    setEdits((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        if (next[id]) next[id] = { ...next[id], deleted: false };
      });
      return next;
    });
    setSaveStatus("idle");
  }, [selectedIds]);

  const leftPane = (
    <div className="flex flex-col min-h-0 flex-1">
      <DateNavigator dateKeys={dateKeys} inViewDate={inViewDate} onDateClick={scrollToDate} />
      <div className="flex-1 min-h-0">
        <TimelineList
        events={filteredEvents}
        selectedId={selectedId}
        selectedIds={multiSelectMode ? selectedIds : undefined}
        deletedIds={deletedIds}
        onSelect={handleSelect}
        onToggleSelect={handleToggleSelect}
        multiSelectMode={multiSelectMode}
        scrollContainerRef={scrollContainerRef}
        setDateGroupRef={setDateGroupRef}
      />
      </div>
    </div>
  );

  const inspectorContent = (
    <InspectorPanel
      selectedEvents={selectedEvents}
      editState={currentEditState}
      onEditChange={handleEditChange}
      attention={data.needs_attention}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      activeSort={activeSort}
      onSortChange={setActiveSort}
      onReviewAmbiguous={handleReviewAmbiguous}
      onReviewLowConfidence={handleReviewLowConfidence}
      onShowAll={() => setActiveFilter("all")}
      onNextIssue={handleNextIssue}
      onPrevIssue={handlePrevIssue}
      hasNextIssue={hasNextIssue}
      hasPrevIssue={hasPrevIssue}
      bulkCategory={bulkCategory}
      onBulkCategoryChange={setBulkCategory}
      onBulkApplyCategory={handleBulkApplyCategory}
      courseTag={courseTag}
      onCourseTagChange={setCourseTag}
      onBulkPrependTag={handleBulkPrependTag}
      onBulkDelete={handleBulkDelete}
      onBulkInclude={handleBulkInclude}
    />
  );

  const mobileBottomBar = !isDesktop ? (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 backdrop-blur-md px-4 py-3 flex items-center justify-between">
      <button
        type="button"
        onClick={() => {
          setActiveFilter(activeFilter === "needs_attention" ? "all" : "needs_attention");
          if (activeFilter !== "needs_attention" && data.needs_attention.total > 0) {
            const first = needsAttentionEvents[0];
            if (first) {
              setSelectedId(first.id);
              scrollToDate(first.date);
            }
          }
        }}
        className="text-sm font-medium text-surface-600 dark:text-surface-300"
      >
        Needs attention ({data.needs_attention.total})
      </button>
      <button
        type="button"
        onClick={() => setExportOpen(true)}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus-ring"
      >
        Download .ics
      </button>
    </div>
  ) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-heading text-xl font-semibold text-surface-900 dark:text-surface-100">
          {data.events.length} events
        </h2>
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && <span className="text-xs text-surface-500" aria-live="polite">Saving...</span>}
          {saveStatus === "saved" && <span className="text-xs text-emerald-600" aria-live="polite">Saved</span>}
          {saveStatus === "error" && <span className="text-xs text-red-600" aria-live="polite">Couldn&apos;t save — retry</span>}
          <button type="button" onClick={() => setMultiSelectMode(!multiSelectMode)} className="rounded-lg border border-surface-300 dark:border-surface-600 px-3 py-1.5 text-xs font-medium focus-ring">
            {multiSelectMode ? "Cancel selection" : "Select multiple"}
          </button>
          <button type="button" onClick={() => { setActiveFilter(activeFilter === "needs_attention" ? "all" : "needs_attention"); }} className="rounded-lg border border-surface-300 dark:border-surface-600 px-3 py-1.5 text-xs font-medium focus-ring">
            Needs attention
          </button>
          <button type="button" onClick={handleSave} disabled={saveStatus === "saving"} className="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-60 focus-ring">
            Save changes
          </button>
          {isDesktop && (
            <button type="button" onClick={() => setExportOpen(true)} className="rounded-lg bg-surface-900 dark:bg-surface-100 px-4 py-1.5 text-xs font-medium text-white dark:text-surface-900 hover:bg-surface-800 dark:hover:bg-surface-200 focus-ring">
              Download .ics
            </button>
          )}
        </div>
      </div>

      <JobReviewShell
        isDesktop={isDesktop}
        leftPane={leftPane}
        rightPane={<div className="p-4">{inspectorContent}</div>}
        sheetOpen={!isDesktop && selectedEvents.length > 0}
        onSheetClose={() => setSelectedId(null)}
        sheetContent={<div className="p-4">{inspectorContent}</div>}
        mobileBottomBar={mobileBottomBar}
      />

      <ExportDialog isOpen={exportOpen} onClose={() => setExportOpen(false)} jobId={jobId} filename={filename} asSheet={!isDesktop} />
    </div>
  );
}
