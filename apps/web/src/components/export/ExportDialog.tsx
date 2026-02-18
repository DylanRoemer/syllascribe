"use client";

import { useState, useRef, useEffect } from "react";
import { getExportUrl } from "@/lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  filename: string;
  /** If true, render as bottom sheet (mobile); else modal (desktop) */
  asSheet?: boolean;
}

export function ExportDialog({ isOpen, onClose, jobId, filename, asSheet = false }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [includeLow, setIncludeLow] = useState(true);
  const [calendarName, setCalendarName] = useState(() => {
    const name = filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    return name || "Course Calendar";
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) dialog.showModal();
    else dialog.close();
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  const content = (
    <>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading text-lg font-semibold text-surface-900 dark:text-surface-100">Export Calendar</h3>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 focus-ring" aria-label="Close">×</button>
      </div>
      <div className="mb-4">
        <label className="text-xs font-medium text-surface-500 dark:text-surface-400 block mb-1.5">Calendar name</label>
        <input type="text" value={calendarName} onChange={(e) => setCalendarName(e.target.value)} className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm focus-ring" />
      </div>
      <label className="flex items-start gap-3 cursor-pointer mb-6 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 p-3">
        <input type="checkbox" checked={includeLow} onChange={(e) => setIncludeLow(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500" />
        <div>
          <span className="text-sm font-medium text-surface-700 dark:text-surface-200 block">Include low-confidence events</span>
          <span className="text-xs text-surface-500 dark:text-surface-400">Events below 60% confidence will be included in the file.</span>
        </div>
      </label>
      <a
        href={getExportUrl(jobId, includeLow)}
        download
        onClick={() => setTimeout(onClose, 300)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus-ring"
      >
        Download .ics
      </a>
      <p className="mt-3 text-xs text-center text-surface-500 dark:text-surface-400">Import into Google Calendar, Apple Calendar, or Outlook.</p>
    </>
  );

  if (asSheet) {
    if (!isOpen) return null;
    return (
      <>
        <div className="fixed inset-0 z-40 bg-surface-900/50 dark:bg-black/60" onClick={onClose} aria-hidden />
        <div role="dialog" aria-modal="true" className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-surface-200 dark:border-surface-700 surface-card shadow-xl p-6">
          <div className="flex justify-center mb-3"><div className="h-1 w-10 rounded-full bg-surface-300 dark:bg-surface-600" /></div>
          {content}
        </div>
      </>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      className="rounded-xl border border-surface-200 dark:border-surface-700 surface-card shadow-xl backdrop:bg-surface-900/50 dark:backdrop:bg-black/60 p-0 w-full max-w-md"
      onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
    >
      <div className="p-6">{content}</div>
    </dialog>
  );
}
