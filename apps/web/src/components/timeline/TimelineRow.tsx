"use client";

import type { EventResponse } from "@/lib/api";

interface Props {
  event: EventResponse;
  isSelected: boolean;
  isDeleted: boolean;
  onSelect: () => void;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
}

const CATEGORY_STYLES: Record<string, string> = {
  exam: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  assignment: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  reading: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  holiday: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  office_hours: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  other: "bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-300",
};

export function TimelineRow({
  event,
  isSelected,
  isDeleted,
  onSelect,
  onToggleSelect,
  showCheckbox = false,
}: Props) {
  const needsAttention = event.is_ambiguous || event.confidence < 0.6;
  const categoryStyle = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.other;

  return (
    <div
      onClick={onSelect}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`
        group relative flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-all duration-150
        ${isDeleted ? "opacity-40" : ""}
        ${
          isSelected
            ? "border-primary-400 dark:border-primary-500 bg-primary-50/50 dark:bg-primary-900/15 shadow-sm"
            : needsAttention
              ? "border-accent-200 dark:border-accent-700/50 bg-accent-50/50 dark:bg-accent-900/10 hover:border-accent-300 dark:hover:border-accent-600"
              : "border-surface-200 dark:border-surface-700 surface-card hover:border-surface-300 dark:hover:border-surface-600 hover:shadow-sm"
        }
      `}
    >
      {showCheckbox && onToggleSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className="mt-1 h-4 w-4 rounded border-surface-300 dark:border-surface-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
          aria-label={`Select ${event.title}`}
        />
      )}
      <div
        className={`timeline-dot mt-1.5 shrink-0 ${
          isSelected ? "active" : needsAttention ? "attention" : ""
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${
          isDeleted ? "line-through text-surface-400 dark:text-surface-500" : "text-surface-900 dark:text-surface-100"
        }`}>
          {event.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${categoryStyle}`}>
            {event.category.replace("_", " ")}
          </span>
          <span className="text-[11px] tabular-nums text-surface-400 dark:text-surface-500">
            {Math.round(event.confidence * 100)}%
          </span>
          {needsAttention && !isDeleted && (
            <span className="inline-flex items-center gap-1 rounded-md bg-accent-100 dark:bg-accent-900/30 px-1.5 py-0.5 text-[11px] font-medium text-accent-700 dark:text-accent-300">
              Review
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
