"use client";

import { useEffect, useRef, useCallback } from "react";

const SWIPE_CLOSE_THRESHOLD_PX = 80;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileBottomSheet({ isOpen, onClose, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const endY = e.changedTouches[0].clientY;
      const deltaY = endY - touchStartY.current;
      if (deltaY > SWIPE_CLOSE_THRESHOLD_PX) onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-surface-900/50 dark:bg-black/60" onClick={onClose} aria-hidden />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-850 shadow-xl"
      >
        <div
          className="sticky top-0 z-10 flex justify-center py-3 bg-white dark:bg-surface-850 touch-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          role="button"
          tabIndex={0}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClose();
            }
          }}
          aria-label="Swipe down to close"
        >
          <div className="h-1 w-10 rounded-full bg-surface-300 dark:bg-surface-600" title="Swipe down to close" />
        </div>
        <div className="absolute top-2 right-3">
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 focus-ring" aria-label="Close panel">×</button>
        </div>
        <div className="px-5 pb-8 pt-1 custom-scrollbar">{children}</div>
      </div>
    </>
  );
}
