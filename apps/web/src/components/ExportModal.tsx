"use client";

import { useState, useRef, useEffect } from "react";
import { getExportUrl } from "@/lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  filename: string;
}

export function ExportModal({ isOpen, onClose, jobId, filename }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [includeLow, setIncludeLow] = useState(true);
  const [calendarName, setCalendarName] = useState(() => {
    const name = filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    return name || "Course Calendar";
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="rounded-xl border border-surface-200 dark:border-surface-700 surface-card shadow-xl backdrop:bg-surface-900/50 dark:backdrop:bg-black/60 p-0 w-full max-w-md"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-lg font-semibold text-surface-900 dark:text-surface-100">
            Export Calendar
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:text-surface-200 dark:hover:bg-surface-700 transition-colors focus-ring"
            aria-label="Close export dialog"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Calendar name */}
        <div className="mb-4">
          <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1.5">
            Calendar name
          </label>
          <input
            type="text"
            value={calendarName}
            onChange={(e) => setCalendarName(e.target.value)}
            className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus-ring"
          />
        </div>

        {/* Include low-confidence toggle */}
        <label className="flex items-start gap-3 cursor-pointer mb-6 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 p-3">
          <input
            type="checkbox"
            checked={includeLow}
            onChange={(e) => setIncludeLow(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-surface-300 dark:border-surface-600 text-primary-600 focus:ring-primary-500"
          />
          <div>
            <span className="text-sm font-medium text-surface-700 dark:text-surface-200 block">
              Include low-confidence events
            </span>
            <span className="text-xs text-surface-500 dark:text-surface-400">
              Events with confidence below 60% will be included but may need manual verification.
            </span>
          </div>
        </label>

        {/* Download button */}
        <a
          href={getExportUrl(jobId, includeLow)}
          download
          onClick={() => {
            setTimeout(onClose, 300);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors focus-ring"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download .ics
        </a>

        <p className="mt-3 text-xs text-center text-surface-500 dark:text-surface-400">
          Import into Google Calendar, Apple Calendar, or Outlook.
        </p>
      </div>
    </dialog>
  );
}
