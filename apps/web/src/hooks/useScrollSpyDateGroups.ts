"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * 1) Timeline calls setDateGroupRef(date, el) for each date group element.
 * 2) IntersectionObserver detects which date group is in view.
 * 3) scrollToDate(date) scrolls the container to that date group.
 * Observation runs after refs are attached (rAF + delayed pass) so inViewDate updates on first load and when dateKeys change.
 */
export function useScrollSpyDateGroups(dateKeys: string[]) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dateGroupRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [inViewDate, setInViewDate] = useState<string | null>(dateKeys[0] ?? null);

  const setDateGroupRef = useCallback((date: string, el: HTMLDivElement | null) => {
    if (el) dateGroupRefs.current.set(date, el);
    else dateGroupRefs.current.delete(date);
  }, []);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || dateKeys.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible: { date: string; ratio: number }[] = [];
        entries.forEach((entry) => {
          const date = entry.target.getAttribute("data-date");
          if (date && entry.intersectionRatio > 0) {
            visible.push({ date, ratio: entry.intersectionRatio });
          }
        });
        if (visible.length > 0) {
          visible.sort((a, b) => b.ratio - a.ratio);
          setInViewDate(visible[0].date);
        }
      },
      { root: container, rootMargin: "-80px 0px -50% 0px", threshold: 0 }
    );

    const observeAll = () => {
      dateKeys.forEach((date) => {
        const el = dateGroupRefs.current.get(date);
        if (el) observer.observe(el);
      });
    };

    const t1 = requestAnimationFrame(observeAll);
    const timeoutId = setTimeout(observeAll, 80);

    return () => {
      cancelAnimationFrame(t1);
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [dateKeys.join(",")]);

  const scrollToDate = useCallback((date: string) => {
    const el = dateGroupRefs.current.get(date);
    const container = scrollContainerRef.current;
    if (el && container) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return { scrollContainerRef, setDateGroupRef, inViewDate, scrollToDate };
}
