"use client";

import { useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/api";

const ACCEPTED = ".pdf,.docx,.png,.jpg,.jpeg";
const MAX_SIZE_MB = 50;

export function UploadDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const allowed = ["pdf", "docx", "png", "jpg", "jpeg"];
      if (!allowed.includes(ext)) {
        setError(`Unsupported file type .${ext}. Accepted formats: ${allowed.join(", ")}`);
        return;
      }

      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`File exceeds the ${MAX_SIZE_MB} MB size limit.`);
        return;
      }

      setIsUploading(true);
      try {
        const { job_id } = await uploadFile(file);
        router.push(`/job/${job_id}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        setIsUploading(false);
      }
    },
    [router]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="w-full max-w-2xl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-label="Upload syllabus file"
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed px-8 py-14 text-center
          transition-all duration-200
          ${
            isDragging
              ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.01]"
              : "border-surface-300 dark:border-surface-600 bg-surface-100/60 dark:bg-surface-800/40 hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-sm"
          }
          ${isUploading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={onFileChange}
          className="hidden"
          aria-hidden="true"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary-200 border-t-primary-600" />
            <p className="text-sm font-medium text-surface-600 dark:text-surface-300">
              Uploading your syllabus...
            </p>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-base font-medium text-surface-800 dark:text-surface-200">
              Drop your syllabus here, or{" "}
              <span className="text-primary-600 dark:text-primary-400 underline underline-offset-2">
                browse files
              </span>
            </p>
            <p className="mt-2 text-sm text-surface-700 dark:text-surface-400">
              PDF, DOCX, PNG, or JPG — up to {MAX_SIZE_MB} MB
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
