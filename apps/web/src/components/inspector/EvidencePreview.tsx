"use client";

interface Props {
  excerpt: string;
  page: number | null;
  sourceKind: string;
  /** Date string to highlight in excerpt (e.g. event.date or raw match from context) */
  rawMatch?: string;
}

const KIND_LABELS: Record<string, string> = {
  pdf_text: "PDF Text",
  table: "Table",
  ocr: "OCR",
  docx: "DOCX",
};

export function EvidencePreview({ excerpt, page, sourceKind, rawMatch }: Props) {
  const highlightedExcerpt = rawMatch ? highlightMatch(excerpt, rawMatch) : excerpt;

  return (
    <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-200 dark:border-surface-700 bg-surface-100/50 dark:bg-surface-800">
        <span className="text-xs font-medium text-surface-500 dark:text-surface-400">Evidence</span>
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
  const regex = new RegExp(escapeRegex(escapedMatch), "gi");
  return escaped.replace(regex, `<mark class="bg-accent-200 dark:bg-accent-700/50 text-accent-900 dark:text-accent-100 rounded px-0.5">$&</mark>`);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
