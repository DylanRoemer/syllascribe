"use client";

interface Props {
  excerpt: string;
  page: number | null;
  sourceKind: string;
  rawMatch?: string;
}

const KIND_LABELS: Record<string, string> = {
  pdf_text: "PDF Text",
  table: "Table",
  ocr: "OCR",
  docx: "DOCX",
};

export function EvidencePreview({ excerpt, page, sourceKind, rawMatch }: Props) {
  const highlightedExcerpt = rawMatch
    ? highlightMatch(excerpt, rawMatch)
    : excerpt;

  return (
    <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-200 dark:border-surface-700 bg-surface-100/50 dark:bg-surface-800">
        <svg className="h-3.5 w-3.5 text-surface-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span className="text-xs font-medium text-surface-500 dark:text-surface-400">
          Source Evidence
        </span>
        <div className="flex-1" />
        {page !== null && (
          <span className="inline-flex items-center rounded bg-surface-200 dark:bg-surface-700 px-1.5 py-0.5 text-[10px] font-medium text-surface-600 dark:text-surface-300">
            Page {page}
          </span>
        )}
        <span className="inline-flex items-center rounded bg-primary-100 dark:bg-primary-900/30 px-1.5 py-0.5 text-[10px] font-medium text-primary-700 dark:text-primary-300">
          {KIND_LABELS[sourceKind] ?? sourceKind}
        </span>
      </div>

      {/* Excerpt */}
      <div className="px-3 py-3 max-h-48 overflow-y-auto custom-scrollbar">
        <pre
          className="text-xs text-surface-600 dark:text-surface-300 whitespace-pre-wrap font-mono leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlightedExcerpt }}
        />
      </div>
    </div>
  );
}

function highlightMatch(text: string, match: string): string {
  if (!match) return escapeHtml(text);

  const escaped = escapeHtml(text);
  const escapedMatch = escapeHtml(match);
  return escaped.replace(
    new RegExp(escapeRegex(escapedMatch), "gi"),
    `<mark class="bg-accent-200 dark:bg-accent-700/50 text-accent-900 dark:text-accent-100 rounded px-0.5">$&</mark>`
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
