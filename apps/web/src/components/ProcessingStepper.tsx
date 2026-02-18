"use client";

import type { JobResponse } from "@/lib/api";

interface Props {
  job: JobResponse;
  onRetry?: () => void;
}

const STEPS = [
  { key: "uploading", label: "Uploading" },
  { key: "extracting", label: "Extracting text" },
  { key: "finding", label: "Finding dates" },
  { key: "preparing", label: "Preparing review" },
] as const;

function getActiveStep(status: JobResponse["status"]): number {
  switch (status) {
    case "queued":
      return 0;
    case "processing":
      return 2;
    case "needs_review":
    case "ready":
      return 4;
    case "failed":
      return -1;
    default:
      return 0;
  }
}

export function ProcessingStepper({ job, onRetry }: Props) {
  const activeStep = getActiveStep(job.status);
  const isFailed = job.status === "failed";
  const isDone = job.status === "needs_review" || job.status === "ready";

  if (isDone) return null;

  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 surface-card p-6 sm:p-8">
      {/* Filename */}
      <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">
        Processing{" "}
        <span className="font-medium text-surface-700 dark:text-surface-200">
          {job.original_filename}
        </span>
      </p>

      {/* Stepper */}
      {!isFailed && (
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((step, i) => {
            const isComplete = i < activeStep;
            const isActive = i === activeStep;

            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                      isComplete
                        ? "bg-primary-600 text-white"
                        : isActive
                          ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500/50"
                          : "bg-surface-200 dark:bg-surface-700 text-surface-400 dark:text-surface-500"
                    }`}
                  >
                    {isComplete ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium text-center whitespace-nowrap ${
                      isComplete || isActive
                        ? "text-surface-700 dark:text-surface-200"
                        : "text-surface-400 dark:text-surface-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mt-[-1rem] transition-colors duration-300 ${
                      i < activeStep
                        ? "bg-primary-500"
                        : "bg-surface-200 dark:bg-surface-700"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Active message */}
      {!isFailed && (
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          <p className="text-sm text-surface-600 dark:text-surface-300">
            {job.status === "queued"
              ? "Your file is in the queue and will be processed shortly."
              : "Extracting dates from your syllabus. This usually takes a few seconds..."}
          </p>
        </div>
      )}

      {/* Failed state */}
      {isFailed && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4">
            <svg className="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Processing failed
              </p>
              {job.error_message && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                  {job.error_message}
                </p>
              )}
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors focus-ring"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
