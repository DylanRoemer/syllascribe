"use client";

import type { EventResponse, NeedsAttention } from "@/lib/api";
import { EvidencePreview } from "./EvidencePreview";
import { NeedsAttentionCard } from "@/components/triage/NeedsAttentionCard";

export type FilterType = "all" | "needs_attention" | "exam" | "assignment" | "reading" | "holiday" | "other";
export type SortType = "date" | "confidence";

interface EditState {
  title: string;
  date: string;
  category: string;
  description: string;
  deleted: boolean;
}

interface Props {
  selectedEvents: EventResponse[];
  editState: EditState | null;
  onEditChange: (field: string, value: string | boolean) => void;
  attention: NeedsAttention;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  activeSort: SortType;
  onSortChange: (sort: SortType) => void;
  onReviewAmbiguous: () => void;
  onReviewLowConfidence: () => void;
  onShowAll: () => void;
  onNextIssue?: () => void;
  onPrevIssue?: () => void;
  hasNextIssue?: boolean;
  hasPrevIssue?: boolean;
  bulkCategory: string;
  onBulkCategoryChange: (cat: string) => void;
  onBulkApplyCategory: () => void;
  courseTag: string;
  onCourseTagChange: (tag: string) => void;
  onBulkPrependTag: () => void;
  onBulkDelete: () => void;
  onBulkInclude: () => void;
}

const CATEGORIES = ["assignment", "exam", "reading", "holiday", "office_hours", "other"];

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needs_attention", label: "Needs attention" },
  { key: "exam", label: "Exams" },
  { key: "assignment", label: "Assignments" },
  { key: "reading", label: "Readings" },
  { key: "holiday", label: "Holidays" },
  { key: "other", label: "Other" },
];

export function InspectorPanel({
  selectedEvents,
  editState,
  onEditChange,
  attention,
  activeFilter,
  onFilterChange,
  activeSort,
  onSortChange,
  onReviewAmbiguous,
  onReviewLowConfidence,
  onShowAll,
  onNextIssue,
  onPrevIssue,
  hasNextIssue = false,
  hasPrevIssue = false,
  bulkCategory,
  onBulkCategoryChange,
  onBulkApplyCategory,
  courseTag,
  onCourseTagChange,
  onBulkPrependTag,
  onBulkDelete,
  onBulkInclude,
}: Props) {
  if (selectedEvents.length === 0) {
    return (
      <div className="space-y-5">
        <NeedsAttentionCard
          attention={attention}
          onReviewAmbiguous={onReviewAmbiguous}
          onReviewLowConfidence={onReviewLowConfidence}
          onShowAll={onShowAll}
          onNextIssue={onNextIssue}
          onPrevIssue={onPrevIssue}
          hasNext={hasNextIssue}
          hasPrev={hasPrevIssue}
        />
        <div>
          <h4 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">Filter</h4>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => onFilterChange(opt.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-ring ${
                  activeFilter === opt.key ? "bg-primary-600 text-white" : "bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">Sort by</h4>
          <div className="flex gap-1.5">
            {(["date", "confidence"] as SortType[]).map((s) => (
              <button
                key={s}
                onClick={() => onSortChange(s)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors capitalize focus-ring ${
                  activeSort === s ? "bg-primary-600 text-white" : "bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-600"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-surface-200 dark:border-surface-700 pt-5 text-center">
          <p className="text-sm text-surface-400 dark:text-surface-500">Select an event to inspect and edit</p>
        </div>
      </div>
    );
  }

  if (selectedEvents.length > 1) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold">
            {selectedEvents.length}
          </div>
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">events selected</h3>
        </div>
        <div>
          <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1.5">Set category</label>
          <div className="flex gap-2">
            <select value={bulkCategory} onChange={(e) => onBulkCategoryChange(e.target.value)} className="flex-1 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-sm focus-ring">
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat.replace("_", " ")}</option>)}
            </select>
            <button onClick={onBulkApplyCategory} className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 focus-ring">Apply</button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1.5">Prepend course tag</label>
          <div className="flex gap-2">
            <input type="text" placeholder="e.g. [HIST 101]" value={courseTag} onChange={(e) => onCourseTagChange(e.target.value)} className="flex-1 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-sm focus-ring" />
            <button onClick={onBulkPrependTag} disabled={!courseTag.trim()} className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50 focus-ring">Apply</button>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-surface-200 dark:border-surface-700 pt-4">
          <button onClick={onBulkInclude} className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-xs font-medium focus-ring">Include all in export</button>
          <button onClick={onBulkDelete} className="w-full rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300 focus-ring">Delete selected</button>
        </div>
      </div>
    );
  }

  const event = selectedEvents[0];
  if (!editState) return null;

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">Edit Event</h3>
      <div>
        <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1">Title</label>
        <input type="text" value={editState.title} onChange={(e) => onEditChange("title", e.target.value)} disabled={editState.deleted} className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm focus-ring disabled:opacity-50" />
      </div>
      <div>
        <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1">Date</label>
        <input type="date" value={editState.date} onChange={(e) => onEditChange("date", e.target.value)} disabled={editState.deleted} className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm tabular-nums focus-ring disabled:opacity-50" />
      </div>
      <div>
        <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1">Category</label>
        <select value={editState.category} onChange={(e) => onEditChange("category", e.target.value)} disabled={editState.deleted} className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm focus-ring disabled:opacity-50">
          {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat.replace("_", " ")}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1">Description (optional)</label>
        <textarea value={editState.description} onChange={(e) => onEditChange("description", e.target.value)} disabled={editState.deleted} rows={2} className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm resize-none focus-ring disabled:opacity-50" />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={editState.deleted} onChange={(e) => onEditChange("deleted", e.target.checked)} className="h-4 w-4 rounded border-surface-300 text-red-600 focus:ring-red-500" />
        <span className="text-sm text-surface-600 dark:text-surface-300">Exclude from export</span>
      </label>
      <div className="text-xs text-surface-400 dark:text-surface-500">Confidence: <span className="tabular-nums font-medium">{Math.round(event.confidence * 100)}%</span></div>
      <EvidencePreview excerpt={event.source_excerpt} page={event.source_page} sourceKind={event.source_kind} rawMatch={event.date} />
    </div>
  );
}
