"use client";

import { MobileBottomSheet } from "@/components/mobile/MobileBottomSheet";

interface Props {
  /** Desktop: true = two columns; false = single column + sheet */
  isDesktop: boolean;
  /** Left column: DateNavigator + scrollable TimelineList */
  leftPane: React.ReactNode;
  /** Right column (desktop only): InspectorPanel */
  rightPane: React.ReactNode;
  /** Mobile: bottom sheet with inspector when event selected */
  sheetOpen: boolean;
  onSheetClose: () => void;
  sheetContent: React.ReactNode;
  /** Mobile: sticky bottom action bar */
  mobileBottomBar: React.ReactNode;
}

export function JobReviewShell({
  isDesktop,
  leftPane,
  rightPane,
  sheetOpen,
  onSheetClose,
  sheetContent,
  mobileBottomBar,
}: Props) {
  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] min-h-[400px]">
      {isDesktop ? (
        <div className="grid grid-cols-[1fr_380px] gap-6 flex-1 min-h-0 overflow-hidden">
          <div className="min-h-0 flex flex-col overflow-hidden">
            {leftPane}
          </div>
          <aside className="border-l border-surface-200 dark:border-surface-700 pl-6 min-h-0 overflow-y-auto flex-shrink-0 custom-scrollbar">
            {rightPane}
          </aside>
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col pb-24 custom-scrollbar">
            {leftPane}
          </div>
          <MobileBottomSheet isOpen={sheetOpen} onClose={onSheetClose}>
            {sheetContent}
          </MobileBottomSheet>
          {mobileBottomBar}
        </>
      )}
    </div>
  );
}
