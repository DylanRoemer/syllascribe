"use client";

import { useState } from "react";

interface Props {
  excerpt: string;
  page: number | null;
  sourceKind: string;
}

const KIND_LABELS: Record<string, string> = {
  pdf_text: "PDF Text",
  table: "Table",
  ocr: "OCR",
  docx: "DOCX",
};

export function SourceExcerpt({ excerpt, page, sourceKind }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
      >
        <svg
          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 4.5l7.5 7.5-7.5 7.5"
          />
        </svg>
        {isOpen ? "Hide source" : "Show source"}
      </button>

      {isOpen && (
        <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-3">
          <div className="flex gap-2 mb-2">
            {page !== null && (
              <span className="inline-block rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                Page {page}
              </span>
            )}
            <span className="inline-block rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {KIND_LABELS[sourceKind] ?? sourceKind}
            </span>
          </div>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">
            {excerpt}
          </pre>
        </div>
      )}
    </div>
  );
}
