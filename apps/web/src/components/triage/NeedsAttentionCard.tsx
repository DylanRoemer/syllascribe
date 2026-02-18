"use client";

import type { NeedsAttention } from "@/lib/api";

interface Props {
  attention: NeedsAttention;
  onReviewAmbiguous: () => void;
  onReviewLowConfidence: () => void;
  onShowAll: () => void;
  onNextIssue?: () => void;
  onPrevIssue?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export function NeedsAttentionCard({
  attention,
  onReviewAmbiguous,
  onReviewLowConfidence,
  onShowAll,
  onNextIssue,
  onPrevIssue,
  hasNext = false,
  hasPrev = false,
}: Props) {
  if (attention.total === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/20 p-4">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">All events look good</p>
        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">No items require manual review.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-accent-200 dark:border-accent-700/50 bg-accent-50 dark:bg-accent-900/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-sm font-medium text-accent-800 dark:text-accent-200">
          {attention.total} event{attention.total !== 1 ? "s" : ""} need review
        </p>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {attention.ambiguous_count > 0 && (
          <button
            onClick={onReviewAmbiguous}
            className="inline-flex items-center rounded-md bg-accent-100 dark:bg-accent-800/30 px-2.5 py-1 text-xs font-medium text-accent-700 dark:text-accent-300 hover:bg-accent-200 dark:hover:bg-accent-800/50 transition-colors focus-ring"
          >
            Review ambiguous ({attention.ambiguous_count})
          </button>
        )}
        {attention.low_confidence_count > 0 && (
          <button
            onClick={onReviewLowConfidence}
            className="inline-flex items-center rounded-md bg-accent-100 dark:bg-accent-800/30 px-2.5 py-1 text-xs font-medium text-accent-700 dark:text-accent-300 hover:bg-accent-200 dark:hover:bg-accent-800/50 transition-colors focus-ring"
          >
            Review low confidence ({attention.low_confidence_count})
          </button>
        )}
        <button
          onClick={onShowAll}
          className="inline-flex items-center rounded-md bg-surface-200 dark:bg-surface-700 px-2.5 py-1 text-xs font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors focus-ring"
        >
          Show all
        </button>
      </div>
      {(onNextIssue || onPrevIssue) && attention.total > 0 && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-accent-200 dark:border-accent-700/50">
          <button
            onClick={onPrevIssue}
            disabled={!hasPrev}
            className="rounded-md px-2 py-1 text-xs font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-40 focus-ring"
          >
            Previous issue
          </button>
          <button
            onClick={onNextIssue}
            disabled={!hasNext}
            className="rounded-md px-2 py-1 text-xs font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-40 focus-ring"
          >
            Next issue
          </button>
        </div>
      )}
    </div>
  );
}
