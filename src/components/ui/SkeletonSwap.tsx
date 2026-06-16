import * as React from "react";

import { cn } from "@/lib/utils";

interface SkeletonSwapProps {
  /** true = show the skeleton; false = show the content */
  loading: boolean;
  /** the exact-shape skeleton to show while loading (use `.shimmer` shapes) */
  skeleton: React.ReactNode;
  /** the real content to cross-fade in once loaded */
  children: React.ReactNode;
  /** cross-fade duration in ms (default 280) */
  duration?: number;
  className?: string;
}

/**
 * MEGA_PLAN §3b motion-layer — cross-fade a skeleton into its content instead of a
 * hard pop. Both layers occupy the same grid cell so there is zero layout shift; the
 * skeleton fades out as the content fades in. Honors prefers-reduced-motion (instant
 * swap, no transition). Keeps the skeleton mounted (display:none) only while fading so
 * the height is owned by whichever layer is visible.
 */
export function SkeletonSwap({
  loading,
  skeleton,
  children,
  duration = 280,
  className,
}: SkeletonSwapProps) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Once we've shown real content, never flash the skeleton again on background refetch.
  const settledRef = React.useRef(false);
  if (!loading) settledRef.current = true;
  const showSkeleton = loading && !settledRef.current;

  const transition = prefersReduced
    ? undefined
    : `opacity ${duration}ms cubic-bezier(0.23,1,0.32,1)`;

  return (
    <div className={cn("grid", className)}>
      <div
        aria-hidden={!showSkeleton}
        style={{
          gridArea: "1 / 1",
          opacity: showSkeleton ? 1 : 0,
          transition,
          pointerEvents: showSkeleton ? "auto" : "none",
          visibility: showSkeleton ? "visible" : "hidden",
        }}
      >
        {skeleton}
      </div>
      <div
        style={{
          gridArea: "1 / 1",
          opacity: showSkeleton ? 0 : 1,
          transition,
          pointerEvents: showSkeleton ? "none" : "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}
