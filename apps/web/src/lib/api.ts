/**
 * API client for the Syllascribe FastAPI backend.
 *
 * In production (e.g. Railway), set NEXT_PUBLIC_API_BASE_URL on the Web service
 * to your API's public URL (e.g. https://sylliscribe-api-production.up.railway.app).
 * Otherwise the browser will try to upload to localhost and requests will fail or hang.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      clearTimeout(timeoutId);
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

    xhr.open("POST", `${API_BASE}/api/upload`);
    xhr.send(formData);
  });
}

export async function uploadFile(file: File): Promise<{ job_id: string }> {
  return uploadFileWithProgress(file);
}

export async function getJob(jobId: string): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/api/job/${jobId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch job status");
  }
  return res.json();
}

export async function getEvents(jobId: string): Promise<EventsListResponse> {
  const res = await fetch(`${API_BASE}/api/job/${jobId}/events`);
  if (!res.ok) {
    throw new Error("Failed to fetch events");
  }
  return res.json();
}

export async function updateEvents(
  jobId: string,
  updates: EventUpdate[]
): Promise<{ updated: number; deleted: number }> {
  const res = await fetch(`${API_BASE}/api/job/${jobId}/events`, {
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
  const res = await fetch(`${API_BASE}/api/job/${jobId}/finalize`, {
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
  return `${API_BASE}/api/job/${jobId}/export.ics?include_low_confidence=${includeLowConfidence}`;
}
