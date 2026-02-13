"use client";

import { useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/api";

const ACCEPTED = ".pdf,.docx,.png,.jpg,.jpeg";
const MAX_SIZE_MB = 50;

export function FileUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // Validate extension
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const allowed = ["pdf", "docx", "png", "jpg", "jpeg"];
      if (!allowed.includes(ext)) {
        setError(`Unsupported file type .${ext}. Allowed: ${allowed.join(", ")}`);
        return;
      }

      // Validate size
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`);
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
    <div className="w-full max-w-xl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          cursor-pointer rounded-xl border-2 border-dashed p-10 text-center
          transition-colors duration-150
          ${
            isDragging
              ? "border-indigo-500 bg-indigo-50"
              : "border-gray-300 bg-white hover:border-indigo-400 hover:bg-gray-50"
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
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">
              Drag & drop your syllabus here, or{" "}
              <span className="text-indigo-600 underline">browse</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">
              PDF, DOCX, PNG, JPG — up to {MAX_SIZE_MB} MB
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
