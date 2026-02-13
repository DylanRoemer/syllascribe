"use client";

import type { NeedsAttention as NeedsAttentionType } from "@/lib/api";

interface Props {
  attention: NeedsAttentionType;
  onScrollToFirst: () => void;
}

export function NeedsAttention({ attention, onScrollToFirst }: Props) {
  if (attention.total === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-amber-800">
            {attention.total} event{attention.total !== 1 ? "s" : ""} need
            attention
          </h3>
          <div className="mt-1 flex gap-4 text-sm text-amber-700">
            {attention.ambiguous_count > 0 && (
              <span>
                {attention.ambiguous_count} ambiguous date
                {attention.ambiguous_count !== 1 ? "s" : ""}
              </span>
            )}
            {attention.low_confidence_count > 0 && (
              <span>
                {attention.low_confidence_count} low confidence
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onScrollToFirst}
          className="rounded-md bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-200 transition-colors"
        >
          Review
        </button>
      </div>
    </div>
  );
}
