"use client";

import type { EventResponse, NeedsAttention } from "@/lib/api";
import { EvidencePreview } from "./EvidencePreview";
import { NeedsAttentionCard } from "./NeedsAttentionCard";

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
  bulkCategory,
  onBulkCategoryChange,
  onBulkApplyCategory,
  courseTag,
  onCourseTagChange,
  onBulkPrependTag,
  onBulkDelete,
  onBulkInclude,
}: Props) {
  // No selection: show overview + filters
  if (selectedEvents.length === 0) {
    return (
      <div className="space-y-5">
        <NeedsAttentionCard
          attention={attention}
          onFilterAmbiguous={() => onFilterChange("needs_attention")}
          onFilterLowConfidence={() => onFilterChange("needs_attention")}
          onShowAll={() => onFilterChange("all")}
        />

        {/* Filters */}
        <div>
          <h4 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">
            Filter
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => onFilterChange(opt.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-ring ${
                  activeFilter === opt.key
                    ? "bg-primary-600 text-white"
                    : "bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div>
          <h4 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">
            Sort by
          </h4>
          <div className="flex gap-1.5">
            {(["date", "confidence"] as SortType[]).map((s) => (
              <button
                key={s}
                onClick={() => onSortChange(s)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors capitalize focus-ring ${
                  activeSort === s
                    ? "bg-primary-600 text-white"
                    : "bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-600"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Placeholder */}
        <div className="border-t border-surface-200 dark:border-surface-700 pt-5 text-center">
          <svg className="h-10 w-10 text-surface-300 dark:text-surface-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
          </svg>
          <p className="text-sm text-surface-400 dark:text-surface-500">
            Select an event to inspect and edit
          </p>
        </div>
      </div>
    );
  }

  // Multi-selection: bulk actions
  if (selectedEvents.length > 1) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold">
            {selectedEvents.length}
          </div>
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
            events selected
          </h3>
        </div>

        {/* Bulk category */}
        <div>
          <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1.5">
            Set category
          </label>
          <div className="flex gap-2">
            <select
              value={bulkCategory}
              onChange={(e) => onBulkCategoryChange(e.target.value)}
              className="flex-1 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-sm text-surface-900 dark:text-surface-100 focus-ring"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat.replace("_", " ")}</option>
              ))}
            </select>
            <button
              onClick={onBulkApplyCategory}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors focus-ring"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Course tag */}
        <div>
          <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1.5">
            Prepend course tag to titles
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. [HIST 101]"
              value={courseTag}
              onChange={(e) => onCourseTagChange(e.target.value)}
              className="flex-1 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus-ring"
            />
            <button
              onClick={onBulkPrependTag}
              disabled={!courseTag.trim()}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-50 focus-ring"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Bulk actions */}
        <div className="flex flex-col gap-2 border-t border-surface-200 dark:border-surface-700 pt-4">
          <button
            onClick={onBulkInclude}
            className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-xs font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors focus-ring"
          >
            Include all in export
          </button>
          <button
            onClick={onBulkDelete}
            className="w-full rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors focus-ring"
          >
            Delete selected
          </button>
        </div>
      </div>
    );
  }

  // Single selection: edit + evidence
  const event = selectedEvents[0];
  if (!editState) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
          Edit Event
        </h3>
        {event.is_ambiguous && (
          <span className="inline-flex items-center gap-1 rounded-md bg-accent-100 dark:bg-accent-900/30 px-2 py-0.5 text-[11px] font-medium text-accent-700 dark:text-accent-300">
            Ambiguous
          </span>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1">
          Title
        </label>
        <input
          type="text"
          value={editState.title}
          onChange={(e) => onEditChange("title", e.target.value)}
          disabled={editState.deleted}
          className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 disabled:opacity-50 focus-ring"
        />
      </div>

      {/* Date */}
      <div>
        <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1">
          Date
        </label>
        <input
          type="date"
          value={editState.date}
          onChange={(e) => onEditChange("date", e.target.value)}
          disabled={editState.deleted}
          className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm tabular-nums text-surface-900 dark:text-surface-100 disabled:opacity-50 focus-ring"
        />
      </div>

      {/* Category */}
      <div>
        <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1">
          Category
        </label>
        <select
          value={editState.category}
          onChange={(e) => onEditChange("category", e.target.value)}
          disabled={editState.deleted}
          className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 disabled:opacity-50 focus-ring"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1">
          Description (optional)
        </label>
        <textarea
          value={editState.description}
          onChange={(e) => onEditChange("description", e.target.value)}
          disabled={editState.deleted}
          rows={2}
          className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 disabled:opacity-50 resize-none focus-ring"
        />
      </div>

      {/* Delete toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={editState.deleted}
          onChange={(e) => onEditChange("deleted", e.target.checked)}
          className="h-4 w-4 rounded border-surface-300 dark:border-surface-600 text-red-600 focus:ring-red-500"
        />
        <span className="text-sm text-surface-600 dark:text-surface-300">
          Exclude from export
        </span>
      </label>

      {/* Confidence */}
      <div className="flex items-center gap-2 text-xs text-surface-400 dark:text-surface-500">
        <span>Confidence:</span>
        <span className="tabular-nums font-medium">{Math.round(event.confidence * 100)}%</span>
      </div>

      {/* Evidence */}
      <EvidencePreview
        excerpt={event.source_excerpt}
        page={event.source_page}
        sourceKind={event.source_kind}
        rawMatch={event.date}
      />
    </div>
  );
}
