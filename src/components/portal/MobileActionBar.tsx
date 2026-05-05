/**
 * P74 — Mobile-first action bar.
 *
 * Sticks to the bottom of the viewport on phones with safe-area padding so
 * the primary action (Save / Submit / Continue) is always reachable without
 * covering the on-screen keyboard's primary affordance. On md+ it
 * transitions to an inline action row.
 *
 * Pages that mount this should add `pb-24 md:pb-0` (or similar) to the
 * scrolling content so the sticky bar never covers the last form field on
 * mobile.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
}

export function MobileActionBar({ children, className }: Props) {
  return (
    <div
      data-testid="mobile-action-bar"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur",
        "px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "md:static md:inset-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 md:max-w-none">
        {children}
      </div>
    </div>
  );
}

export default MobileActionBar;