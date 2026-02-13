"use client";

import { useState } from "react";
import { getExportUrl } from "@/lib/api";

interface Props {
  jobId: string;
  eventCount: number;
}

export function ExportPanel({ jobId, eventCount }: Props) {
  const [includeLow, setIncludeLow] = useState(true);

  if (eventCount === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="font-semibold text-gray-900 mb-3">Export Calendar</h3>

      <label className="flex items-center gap-2 text-sm text-gray-700 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={includeLow}
          onChange={(e) => setIncludeLow(e.target.checked)}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        Include low-confidence events
      </label>

      <a
        href={getExportUrl(jobId, includeLow)}
        download
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
          />
        </svg>
        Download .ics
      </a>

      <p className="mt-2 text-xs text-gray-500">
        Import into Google Calendar, Apple Calendar, or Outlook.
      </p>
    </div>
  );
}
