/**
 * API client for the Syllascribe FastAPI backend.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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

export async function uploadFile(file: File): Promise<{ job_id: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }

  return res.json();
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
