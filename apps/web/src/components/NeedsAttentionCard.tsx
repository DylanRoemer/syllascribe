"use client";

import type { NeedsAttention } from "@/lib/api";

interface Props {
  attention: NeedsAttention;
  onFilterAmbiguous: () => void;
  onFilterLowConfidence: () => void;
  onShowAll: () => void;
}

export function NeedsAttentionCard({
  attention,
  onFilterAmbiguous,
  onFilterLowConfidence,
  onShowAll,
}: Props) {
  if (attention.total === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/20 p-4">
        <div className="flex items-center gap-2">
          <svg className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
            All events look good
          </p>
        </div>
        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
          No items require manual review.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-accent-200 dark:border-accent-700/50 bg-accent-50 dark:bg-accent-900/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <svg className="h-4.5 w-4.5 text-accent-600 dark:text-accent-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className="text-sm font-medium text-accent-800 dark:text-accent-200">
          {attention.total} event{attention.total !== 1 ? "s" : ""} need review
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {attention.ambiguous_count > 0 && (
          <button
            onClick={onFilterAmbiguous}
            className="inline-flex items-center gap-1 rounded-md bg-accent-100 dark:bg-accent-800/30 px-2.5 py-1 text-xs font-medium text-accent-700 dark:text-accent-300 hover:bg-accent-200 dark:hover:bg-accent-800/50 transition-colors focus-ring"
          >
            {attention.ambiguous_count} ambiguous
          </button>
        )}
        {attention.low_confidence_count > 0 && (
          <button
            onClick={onFilterLowConfidence}
            className="inline-flex items-center gap-1 rounded-md bg-accent-100 dark:bg-accent-800/30 px-2.5 py-1 text-xs font-medium text-accent-700 dark:text-accent-300 hover:bg-accent-200 dark:hover:bg-accent-800/50 transition-colors focus-ring"
          >
            {attention.low_confidence_count} low confidence
          </button>
        )}
        <button
          onClick={onShowAll}
          className="inline-flex items-center gap-1 rounded-md bg-surface-200 dark:bg-surface-700 px-2.5 py-1 text-xs font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors focus-ring"
        >
          Show all
        </button>
      </div>
    </div>
  );
}
