"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadFileWithProgress, isApiMisconfiguredForProduction } from "@/lib/api";

const ACCEPTED = ".pdf,.docx,.png,.jpg,.jpeg";
const MAX_SIZE_MB = 50;

const API_MISCONFIG_MESSAGE =
  "Uploads are disabled: this app is running in production but the API URL is set to localhost. Set NEXT_PUBLIC_API_BASE_URL to your API's public URL (e.g. https://your-api.up.railway.app) in the Web service settings on Railway and redeploy.";

export function UploadDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [apiMisconfigured, setApiMisconfigured] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setApiMisconfigured(isApiMisconfiguredForProduction());
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      // #region agent log
      const _logA1 = { location: "UploadDropzone.tsx:handleFile", message: "handleFile called", data: { fileName: file.name, fileSize: file.size }, hypothesisId: "A" };
      console.log("[debug]", _logA1);
      fetch("http://127.0.0.1:7243/ingest/4fa9d56-0c07-4559-a3dd-8cbc6c272e7d", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ..._logA1, timestamp: Date.now() }) }).catch(() => {});
      // #endregion
      if (isApiMisconfiguredForProduction()) {
        setError(API_MISCONFIG_MESSAGE);
        return;
      }
      setError(null);
      setUploadProgress(0);

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

      // #region agent log
      const _logA2 = { location: "UploadDropzone.tsx:handleFile", message: "validation passed, calling uploadFileWithProgress", data: { fileName: file.name }, hypothesisId: "A" };
      console.log("[debug]", _logA2);
      fetch("http://127.0.0.1:7243/ingest/4fa9d56-0c07-4559-a3dd-8cbc6c272e7d", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ..._logA2, timestamp: Date.now() }) }).catch(() => {});
      // #endregion
      setIsUploading(true);
      try {
        const { job_id } = await uploadFileWithProgress(file, (percent) => setUploadProgress(percent));
        router.push(`/job/${job_id}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        // #region agent log
        const _logD = { location: "UploadDropzone.tsx:catch", message: "upload rejected", data: { message }, hypothesisId: "D" };
        console.log("[debug]", _logD);
        fetch("http://127.0.0.1:7243/ingest/4fa9d56-0c07-4559-a3dd-8cbc6c272e7d", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ..._logD, timestamp: Date.now() }) }).catch(() => {});
        // #endregion
        setError(message);
        setIsUploading(false);
        setUploadProgress(0);
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
      {apiMisconfigured && (
        <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {API_MISCONFIG_MESSAGE}
        </div>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!apiMisconfigured) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !apiMisconfigured && inputRef.current?.click()}
        role="button"
        tabIndex={apiMisconfigured ? -1 : 0}
        onKeyDown={(e) => {
          if (apiMisconfigured) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-label="Upload syllabus file"
        className={`
          relative rounded-xl border-2 border-dashed px-8 py-14 text-center
          transition-all duration-200
          ${
            isDragging
              ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.01]"
              : "border-surface-300 dark:border-surface-600 bg-surface-100/60 dark:bg-surface-800/40 hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-sm"
          }
          ${apiMisconfigured ? "cursor-not-allowed opacity-60 pointer-events-none" : "cursor-pointer"}
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
            <div className="w-full max-w-xs">
              <div className="h-2 w-full rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                <div
                  className="h-full bg-primary-600 transition-[width] duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
            <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
              {uploadProgress < 100 ? `Uploading… ${uploadProgress}%` : "Processing…"}
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
