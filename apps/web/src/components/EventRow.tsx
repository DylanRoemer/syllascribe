"use client";

import { SourceExcerpt } from "./SourceExcerpt";
import type { EventResponse } from "@/lib/api";

interface Props {
  event: EventResponse;
  editState: {
    title: string;
    date: string;
    category: string;
    deleted: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
  flagRef?: React.RefCallback<HTMLDivElement>;
}

const CATEGORIES = [
  "assignment",
  "exam",
  "reading",
  "holiday",
  "office_hours",
  "other",
];

function confidenceBadge(confidence: number) {
  if (confidence >= 0.8)
    return (
      <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        {Math.round(confidence * 100)}%
      </span>
    );
  if (confidence >= 0.6)
    return (
      <span className="inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
        {Math.round(confidence * 100)}%
      </span>
    );
  return (
    <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
      {Math.round(confidence * 100)}%
    </span>
  );
}

export function EventRow({ event, editState, onChange, flagRef }: Props) {
  const needsAttention = event.is_ambiguous || event.confidence < 0.6;

  return (
    <div
      ref={flagRef}
      className={`rounded-lg border p-4 transition-colors ${
        editState.deleted
          ? "bg-red-50 border-red-200 opacity-60"
          : needsAttention
            ? "bg-amber-50 border-amber-200"
            : "bg-white border-gray-200"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        {/* Title */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500 font-medium block mb-1">
            Title
          </label>
          <input
            type="text"
            value={editState.title}
            onChange={(e) => onChange("title", e.target.value)}
            disabled={editState.deleted}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
          />
        </div>

        {/* Date */}
        <div className="w-40">
          <label className="text-xs text-gray-500 font-medium block mb-1">
            Date
          </label>
          <input
            type="date"
            value={editState.date}
            onChange={(e) => onChange("date", e.target.value)}
            disabled={editState.deleted}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
          />
        </div>

        {/* Category */}
        <div className="w-36">
          <label className="text-xs text-gray-500 font-medium block mb-1">
            Category
          </label>
          <select
            value={editState.category}
            onChange={(e) => onChange("category", e.target.value)}
            disabled={editState.deleted}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Confidence + Delete */}
        <div className="flex flex-col items-center gap-1 pt-5">
          {confidenceBadge(event.confidence)}
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={editState.deleted}
              onChange={(e) => onChange("deleted", e.target.checked)}
              className="rounded border-gray-300"
            />
            Delete
          </label>
        </div>
      </div>

      {/* Flags */}
      {needsAttention && !editState.deleted && (
        <div className="mt-2 flex gap-2">
          {event.is_ambiguous && (
            <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Ambiguous date
            </span>
          )}
          {event.confidence < 0.6 && (
            <span className="inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
              Low confidence
            </span>
          )}
        </div>
      )}

      {/* Source excerpt */}
      <SourceExcerpt
        excerpt={event.source_excerpt}
        page={event.source_page}
        sourceKind={event.source_kind}
      />
    </div>
  );
}
