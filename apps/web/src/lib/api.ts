/**
 * API client for the Syllascribe FastAPI backend.
 *
 * In production (e.g. Railway), set NEXT_PUBLIC_API_BASE_URL on the Web service
 * to your API's public URL. If unset in production, we use the current origin so
 * the app never sends requests to localhost (e.g. use a reverse proxy so /api goes to the API).
 */

const ENV_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * Effective API base URL. In the browser, never use localhost when the app is
 * served from a non-localhost origin (avoids production builds defaulting to localhost).
 * When NEXT_PUBLIC_API_BASE_URL is unset at build time (e.g. Railway), we derive the
 * API URL from the web origin so uploads hit the API instead of the Next.js proxy.
 */
function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return ENV_API_BASE;
  }
  const hostname = window.location.hostname;
  const origin = window.location.origin;
  const isProduction = hostname !== "localhost" && hostname !== "127.0.0.1";
  const envPointsToLocalhost =
    ENV_API_BASE.includes("localhost") || ENV_API_BASE.includes("127.0.0.1");
  // Production but env was localhost/unset at build time → don't use same-origin (proxy would forward to localhost and hang)
  if (isProduction && envPointsToLocalhost) {
    // Derive API URL from web origin (e.g. syllascribe-web-... → syllascribe-api-...)
    if (hostname.includes("-web-")) {
      const apiHost = hostname.replace(/-web-/, "-api-");
      return `${window.location.protocol}//${apiHost}`;
    }
    return origin;
  }
  return ENV_API_BASE;
}

/** True when app is served from a non-localhost origin but API is still localhost (e.g. Web built without NEXT_PUBLIC_API_BASE_URL on Railway). */
export function isApiMisconfiguredForProduction(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const apiBase = getApiBaseUrl();
  const apiIsLocal =
    apiBase.includes("localhost") || apiBase.includes("127.0.0.1");
  return !isLocal && apiIsLocal;
}

export function getApiBase(): string {
  return getApiBaseUrl();
}

const UPLOAD_TIMEOUT_MS = 180_000; // 3 minutes for large files on slow connections

// ── Types ───────────────────────────────────────────────────────────────────

export interface JobResponse {
  id: string;
  status: "queued" | "processing" | "needs_review" | "ready" | "failed";
  original_filename: string;
  error_message: string | null;
  event_count: number;
  needs_attention_count: number;
  created_at: string;
  updated_at: string;
}

export interface EventResponse {
  id: string;
  job_id: string;
  course_id: number | null;
  title: string;
  description: string | null;
  date: string; // YYYY-MM-DD
  all_day: boolean;
  category: string;
  confidence: number;
  source_page: number | null;
  source_excerpt: string;
  source_kind: string;
  is_ambiguous: boolean;
  created_at: string;
  updated_at: string;
}

export interface NeedsAttention {
  ambiguous_count: number;
  low_confidence_count: number;
  total: number;
}

export interface EventsListResponse {
  events: EventResponse[];
  needs_attention: NeedsAttention;
}

export interface EventUpdate {
  id: string;
  title?: string;
  date?: string;
  category?: string;
  description?: string;
  delete?: boolean;
}

// ── API functions ───────────────────────────────────────────────────────────

/**
 * Upload a file with optional progress callback. Uses XHR so we can report upload progress.
 * Times out after UPLOAD_TIMEOUT_MS so slow or broken connections fail with a clear error.
 */
export function uploadFileWithProgress(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ job_id: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    const timeoutId = setTimeout(() => {
      xhr.abort();
      reject(new Error("Upload timed out. Check your connection and try again, or use a smaller file."));
    }, UPLOAD_TIMEOUT_MS);

    xhr.upload.addEventListener("progress", (e) => {
      if (!onProgress) return;
      let percent: number;
      if (e.lengthComputable && e.total > 0) {
        percent = Math.round((e.loaded / e.total) * 100);
      } else if (e.loaded > 0 && file.size > 0) {
        percent = Math.min(99, Math.round((e.loaded / file.size) * 100));
      } else {
        percent = 0;
      }
      onProgress(percent);
    });

    xhr.addEventListener("load", () => {
      clearTimeout(timeoutId);
      if (onProgress) onProgress(100);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { job_id: string };
          resolve(data);
        } catch {
          reject(new Error("Upload failed"));
        }
      } else {
        let detail = "Upload failed";
        try {
          const err = JSON.parse(xhr.responseText) as { detail?: string };
          detail = err.detail ?? detail;
        } catch {
          // ignore
        }
        reject(new Error(detail));
      }
    });

    xhr.addEventListener("error", () => {
      clearTimeout(timeoutId);
      reject(new Error("Network error. Check that the API is reachable and try again."));
    });

    xhr.addEventListener("abort", () => {
      clearTimeout(timeoutId);
      if (!xhr.responseURL) reject(new Error("Upload timed out. Check your connection and try again."));
    });

    xhr.open("POST", `${getApiBaseUrl()}/api/upload`);
    xhr.send(formData);
  });
}

export async function uploadFile(file: File): Promise<{ job_id: string }> {
  return uploadFileWithProgress(file);
}

export async function getJob(jobId: string): Promise<JobResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/job/${jobId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch job status");
  }
  return res.json();
}

export async function getEvents(jobId: string): Promise<EventsListResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/job/${jobId}/events`);
  if (!res.ok) {
    throw new Error("Failed to fetch events");
  }
  return res.json();
}

export async function updateEvents(
  jobId: string,
  updates: EventUpdate[]
): Promise<{ updated: number; deleted: number }> {
  const res = await fetch(`${getApiBaseUrl()}/api/job/${jobId}/events`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) {
    throw new Error("Failed to save changes");
  }
  return res.json();
}

export async function finalizeJob(jobId: string): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/job/${jobId}/finalize`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error("Failed to finalize job");
  }
}

export function getExportUrl(
  jobId: string,
  includeLowConfidence: boolean = true
): string {
  return `${getApiBaseUrl()}/api/job/${jobId}/export.ics?include_low_confidence=${includeLowConfidence}`;
}
