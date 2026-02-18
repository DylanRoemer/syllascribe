"use client";

export function SkeletonTimeline() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3].map((group) => (
        <div key={group}>
          {/* Date header skeleton */}
          <div className="mb-3">
            <div className="skeleton h-4 w-44 rounded" />
          </div>
          {/* Event rows */}
          <div className="space-y-3 pl-10">
            {Array.from({ length: group === 1 ? 3 : 2 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg border border-surface-200 dark:border-surface-700 surface-card p-4"
              >
                <div className="skeleton h-2.5 w-2.5 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/3 rounded" />
                </div>
                <div className="skeleton h-5 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
