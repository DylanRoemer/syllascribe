"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

const EVENT_PARAM = "event";

/**
 * Syncs selected event ID with URL query param ?event=<id>.
 * Refresh preserves selection. Reading is from URL; writing updates URL.
 */
export function useSelectionQueryParam(): [string | null, (eventId: string | null) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedId = searchParams.get(EVENT_PARAM);

  const setSelectedId = useCallback(
    (eventId: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (eventId) {
        next.set(EVENT_PARAM, eventId);
      } else {
        next.delete(EVENT_PARAM);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return [selectedId, setSelectedId];
}
