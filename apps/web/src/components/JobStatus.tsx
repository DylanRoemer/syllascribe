"use client";

import type { JobResponse } from "@/lib/api";

interface Props {
  job: JobResponse;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  queued: { label: "Queued", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  processing: { label: "Processing...", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  needs_review: { label: "Needs Review", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  ready: { label: "Ready", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  failed: { label: "Failed", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

export function JobStatus({ job }: Props) {
  const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.processing;

  return (
    <div className={`rounded-lg border p-6 ${cfg.bg}`}>
      <div className="flex items-center gap-3 mb-2">
        {(job.status === "queued" || job.status === "processing") && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
        )}
        <h2 className={`text-lg font-semibold ${cfg.color}`}>{cfg.label}</h2>
      </div>

      <p className="text-sm text-gray-600">
        File: <span className="font-medium">{job.original_filename}</span>
      </p>

      {job.status === "processing" && (
        <p className="mt-2 text-sm text-gray-500">
          Extracting dates from your syllabus. This usually takes a few seconds...
        </p>
      )}

      {job.status === "queued" && (
        <p className="mt-2 text-sm text-gray-500">
          Your file is in the queue and will be processed shortly.
        </p>
      )}

      {job.status === "failed" && job.error_message && (
        <div className="mt-3 rounded bg-red-100 px-3 py-2 text-sm text-red-800">
          <strong>Error:</strong> {job.error_message}
        </div>
      )}
    </div>
  );
}
