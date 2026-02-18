"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { getJob, getEvents } from "@/lib/api";
import type { JobResponse, EventsListResponse } from "@/lib/api";
import { ProcessingStepper } from "@/components/ProcessingStepper";
import { SkeletonTimeline } from "@/components/SkeletonTimeline";
import { JobReview } from "@/components/JobReview";

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const router = useRouter();
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
      /* events may not exist yet */
    }
  }, [jobId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let mounted = true;
    const poll = async () => {
      const data = await fetchJob();
      if (!mounted) return;
      if (data && (data.status === "needs_review" || data.status === "ready")) {
        fetchEvents();
        if (interval) clearInterval(interval);
      } else if (data?.status === "failed" && interval) clearInterval(interval);
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
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 p-6 text-center max-w-md">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
          <button onClick={() => router.push("/")} className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus-ring">
            Upload another file
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  const isProcessing = job.status === "queued" || job.status === "processing";
  const isReviewable = job.status === "needs_review" || job.status === "ready";

  if (isProcessing || job.status === "failed") {
    return (
      <div className="space-y-6">
        <ProcessingStepper job={job} onRetry={() => router.push("/")} />
        {isProcessing && <SkeletonTimeline />}
      </div>
    );
  }

  if (isReviewable && events) {
    if (events.events.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
          <p className="text-surface-600 dark:text-surface-400 mb-4">No dates were found in this syllabus.</p>
          <p className="text-sm text-surface-500 dark:text-surface-500 mb-6">Try a different file or check that the document contains a schedule or calendar section.</p>
          <button onClick={() => router.push("/")} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus-ring">
            Upload another file
          </button>
        </div>
      );
    }
    return (
      <Suspense fallback={<SkeletonTimeline />}>
        <JobReview
          jobId={jobId}
          data={events}
          filename={job.original_filename}
          onRefresh={() => {
            fetchEvents();
            fetchJob();
          }}
        />
      </Suspense>
    );
  }

  return <SkeletonTimeline />;
}
