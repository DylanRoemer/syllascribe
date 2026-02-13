"use client";

import { useEffect, useState, useCallback, use } from "react";
import { getJob, getEvents } from "@/lib/api";
import type { JobResponse, EventsListResponse } from "@/lib/api";
import { JobStatus } from "@/components/JobStatus";
import { EventReview } from "@/components/EventReview";

export default function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: jobId } = use(params);
  const [job, setJob] = useState<JobResponse | null>(null);
  const [events, setEvents] = useState<EventsListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    try {
      const data = await getJob(jobId);
      setJob(data);
      return data;
    } catch {
      setError("Failed to load job status.");
      return null;
    }
  }, [jobId]);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await getEvents(jobId);
      setEvents(data);
    } catch {
      // Events may not exist yet
    }
  }, [jobId]);

  // Poll for job status
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    const poll = async () => {
      const data = await fetchJob();
      if (!mounted) return;

      if (data && (data.status === "needs_review" || data.status === "ready")) {
        fetchEvents();
        if (interval) clearInterval(interval);
      } else if (data && data.status === "failed") {
        if (interval) clearInterval(interval);
      }
    };

    poll();
    interval = setInterval(poll, 2000);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [fetchJob, fetchEvents]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <JobStatus job={job} />

      {events &&
        (job.status === "needs_review" || job.status === "ready") && (
          <EventReview
            jobId={jobId}
            data={events}
            onRefresh={() => {
              fetchEvents();
              fetchJob();
            }}
          />
        )}
    </div>
  );
}
