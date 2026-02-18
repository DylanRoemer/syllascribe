"use client";

import { useMemo } from "react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
} from "date-fns";

interface Props {
  dateKeys: string[];
  inViewDate: string | null;
  onDateClick: (date: string) => void;
}

export function DateNavigator({ dateKeys, inViewDate, onDateClick }: Props) {
  const { monthGrids, dateSet } = useMemo(() => {
    if (dateKeys.length === 0) return { monthGrids: [] as { label: string; monthStart: Date; weeks: Date[][] }[], dateSet: new Set<string>() };
    const set = new Set(dateKeys);
    const parsed = dateKeys.map((d) => parseISO(d));
    const min = new Date(Math.min(...parsed.map((d) => d.getTime())));
    const max = new Date(Math.max(...parsed.map((d) => d.getTime())));
    const grids: { label: string; monthStart: Date; weeks: Date[][] }[] = [];
    let cur = startOfMonth(min);
    const end = endOfMonth(max);
    while (cur <= end) {
      const monthStart = startOfMonth(cur);
      const monthEnd = endOfMonth(cur);
      const rangeStart = startOfWeek(monthStart);
      const rangeEnd = endOfWeek(monthEnd);
      const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
      const weeks: Date[][] = [];
      for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
      grids.push({ label: format(monthStart, "MMMM yyyy"), monthStart, weeks });
      cur = addMonths(cur, 1);
    }
    return { monthGrids: grids, dateSet: set };
  }, [dateKeys]);

  const inView = inViewDate ? parseISO(inViewDate) : null;

  if (dateKeys.length === 0) return null;

  return (
    <div className="rounded-lg border border-surface-200 dark:border-surface-700 surface-card p-3 mb-4">
      {monthGrids.map((grid) => (
        <div key={grid.label} className="mb-3 last:mb-0">
          <div className="text-[11px] font-semibold text-surface-500 dark:text-surface-400 mb-1.5">
            {grid.label}
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-[10px] font-medium text-surface-400 dark:text-surface-500 py-0.5">
                {d}
              </div>
            ))}
            {grid.weeks.flatMap((week) =>
              week.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const hasEvent = dateSet.has(dateStr);
                const isInView = inView && isSameDay(day, inView);
                const sameMonth = isSameMonth(day, grid.monthStart);
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => hasEvent && onDateClick(dateStr)}
                    disabled={!hasEvent}
                    className={`
                      min-w-[24px] h-6 rounded text-[11px] tabular-nums transition-colors focus-ring
                      ${!hasEvent ? "text-surface-300 dark:text-surface-600 cursor-default" : "cursor-pointer"}
                      ${!sameMonth ? "text-surface-300 dark:text-surface-600" : "text-surface-700 dark:text-surface-200"}
                      ${isInView ? "bg-primary-600 text-white font-semibold" : hasEvent ? "hover:bg-surface-200 dark:hover:bg-surface-700" : ""}
                    `}
                  >
                    {format(day, "d")}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
