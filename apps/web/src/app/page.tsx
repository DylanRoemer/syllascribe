"use client";

import { useEffect, useState } from "react";
import { UploadDropzone } from "@/components/UploadDropzone";
import { isApiMisconfiguredForProduction } from "@/lib/api";

export default function HomePage() {
  const [showMisconfiguredBanner, setShowMisconfiguredBanner] = useState(false);

  useEffect(() => {
    setShowMisconfiguredBanner(isApiMisconfiguredForProduction());
  }, []);

  return (
    <div className="flex flex-col items-center">
      {/* ── API misconfiguration warning (production only) ─────────────── */}
      {showMisconfiguredBanner && (
        <div
          className="w-full max-w-2xl mb-4 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
          role="alert"
        >
          This app is not configured to talk to the API. Uploads will not work.
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="pt-12 pb-16 text-center max-w-2xl">
        <h1 className="font-heading text-4xl sm:text-5xl font-semibold tracking-tight text-surface-900 dark:text-surface-50 leading-tight">
          Turn Your Syllabus
          <br />
          Into a Calendar
        </h1>
        <p className="mt-5 text-lg text-surface-800 dark:text-surface-400 leading-relaxed max-w-xl mx-auto">
          Upload a course syllabus and get every key date — assignments, exams,
          holidays — extracted, reviewed, and exported as an{" "}
          <code className="rounded bg-primary-100 dark:bg-primary-900/30 px-1.5 py-0.5 text-sm font-medium text-primary-800 dark:text-primary-300">
            .ics
          </code>{" "}
          calendar file.
        </p>
      </section>

      {/* ── Upload ───────────────────────────────────────────────────── */}
      <UploadDropzone />

      {/* ── Trust Row ────────────────────────────────────────────────── */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-surface-800 dark:text-surface-400">
        <TrustItem icon={<LockIcon />} text="No account required" />
        <TrustItem icon={<CalendarIcon />} text="Google / Apple / Outlook" />
        <TrustItem icon={<ClockIcon />} text="Files deleted after 7 days" />
      </div>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section className="mt-24 w-full max-w-4xl">
        <h2 className="font-heading text-2xl font-semibold text-center text-surface-900 dark:text-surface-100 mb-10">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StepCard
            number="1"
            title="Upload"
            description="Drop your syllabus — PDF, DOCX, or a scanned image. Processing takes seconds."
            icon={<UploadIcon />}
          />
          <StepCard
            number="2"
            title="Review"
            description="Verify extracted dates, fix anything flagged as ambiguous, and see the source text as evidence."
            icon={<ReviewIcon />}
          />
          <StepCard
            number="3"
            title="Export"
            description="Download a standard .ics file and import it directly into your calendar app."
            icon={<ExportIcon />}
          />
        </div>
      </section>

      {/* ── Supported Formats ────────────────────────────────────────── */}
      <section className="mt-20 w-full max-w-4xl">
        <h2 className="font-heading text-2xl font-semibold text-center text-surface-900 dark:text-surface-100 mb-8">
          Supported Formats
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormatCard
            label="PDF"
            detail="Native text extraction with table detection"
          />
          <FormatCard
            label="DOCX"
            detail="Microsoft Word document parsing"
          />
          <FormatCard
            label="Scanned Images"
            detail="OCR fallback for PNG, JPG, and scanned PDFs"
          />
        </div>
      </section>

      {/* ── Privacy ──────────────────────────────────────────────────── */}
      <section className="mt-20 mb-16 w-full max-w-2xl text-center">
        <h2 className="font-heading text-2xl font-semibold text-surface-900 dark:text-surface-100 mb-4">
          Privacy and Retention
        </h2>
        <p className="text-surface-800 dark:text-surface-400 leading-relaxed">
          Uploaded files are processed on our server and automatically deleted
          after 7 days. No account is required. No data is shared with third
          parties. Calendar extraction runs entirely with deterministic rules —
          your syllabus is never sent to an external AI service.
        </p>
      </section>

      {/* ── Preview Mock ─────────────────────────────────────────────── */}
      <section className="mb-20 w-full max-w-4xl">
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 surface-card overflow-hidden shadow-sm">
          <div className="border-b border-surface-200 dark:border-surface-700 px-5 py-3 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-surface-300 dark:bg-surface-600" />
            <div className="h-3 w-3 rounded-full bg-surface-300 dark:bg-surface-600" />
            <div className="h-3 w-3 rounded-full bg-surface-300 dark:bg-surface-600" />
            <span className="ml-3 text-xs text-surface-700 dark:text-surface-400">
              Review extracted events
            </span>
          </div>
          <div className="p-6 space-y-4">
            <MockEventRow
              date="Mon, Jan 6"
              title="Course Introduction; Syllabus Overview"
              category="other"
              confidence={0.85}
            />
            <MockEventRow
              date="Wed, Jan 29"
              title="Mid-term Exam 1"
              category="exam"
              confidence={0.92}
            />
            <MockEventRow
              date="Mon, Feb 17"
              title="Ch. 20 Political Economy"
              category="reading"
              confidence={0.78}
              attention
            />
            <MockEventRow
              date="Wed, Mar 12"
              title="Final Exam"
              category="exam"
              confidence={0.95}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {text}
    </span>
  );
}

function StepCard({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 surface-card p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
          {icon}
        </div>
        <div>
          <span className="text-xs font-medium text-surface-600 dark:text-surface-500 uppercase tracking-wider">
            Step {number}
          </span>
          <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">
            {title}
          </h3>
        </div>
      </div>
      <p className="text-sm text-surface-800 dark:text-surface-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function FormatCard({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-lg border border-surface-200 dark:border-surface-700 surface-card px-5 py-4 text-center">
      <p className="font-semibold text-surface-900 dark:text-surface-100">{label}</p>
      <p className="mt-1 text-sm text-surface-700 dark:text-surface-400">{detail}</p>
    </div>
  );
}

function MockEventRow({
  date,
  title,
  category,
  confidence,
  attention,
}: {
  date: string;
  title: string;
  category: string;
  confidence: number;
  attention?: boolean;
}) {
  const categoryColors: Record<string, string> = {
    exam: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    assignment: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    reading: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    holiday: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    other: "bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-300",
  };

  return (
    <div className={`flex items-center gap-4 rounded-lg px-4 py-3 ${
      attention
        ? "bg-accent-50 dark:bg-accent-900/10 border border-accent-200 dark:border-accent-700/50"
        : "bg-surface-50 dark:bg-surface-800/50"
    }`}>
      <span className="text-sm tabular-nums text-surface-700 dark:text-surface-400 w-24 shrink-0">
        {date}
      </span>
      <span className="text-sm font-medium text-surface-900 dark:text-surface-100 flex-1">
        {title}
      </span>
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${categoryColors[category] || categoryColors.other}`}>
        {category}
      </span>
      <span className="text-xs tabular-nums text-surface-600 dark:text-surface-500 w-10 text-right">
        {Math.round(confidence * 100)}%
      </span>
      {attention && (
        <span className="inline-flex items-center rounded-md bg-accent-100 dark:bg-accent-900/30 px-2 py-0.5 text-xs font-medium text-accent-700 dark:text-accent-300">
          Review
        </span>
      )}
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────────── */

function LockIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}
