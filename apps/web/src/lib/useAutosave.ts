"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Debounced autosave hook. Calls `onSave` after `delayMs` of inactivity
 * whenever `deps` change. Returns a `flushNow` function to trigger immediately.
 */
export function useAutosave(
  onSave: () => Promise<void>,
  deps: unknown[],
  delayMs: number = 800,
  enabled: boolean = true,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  const isFirstRender = useRef(true);

  onSaveRef.current = onSave;

  useEffect(() => {
    // Skip on first render (initial load)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!enabled) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      onSaveRef.current();
    }, delayMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const flushNow = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onSaveRef.current();
  }, []);

  return { flushNow };
}
