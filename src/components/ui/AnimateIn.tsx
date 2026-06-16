import * as React from "react";

import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "none";

interface AnimateInProps extends React.HTMLAttributes<HTMLDivElement> {
  /** entrance offset direction (default "up") */
  direction?: Direction;
  /** ms delay before the reveal starts (for hand-rolled staggers) */
  delay?: number;
  /** travel distance in px (default 16, the app-tuned dashboard value) */
  distance?: number;
  /** re-trigger every time it scrolls into view (default false = once) */
  repeat?: boolean;
  /** render as a different element while keeping the reveal */
  as?: React.ElementType;
}

/**
 * MEGA_PLAN §3b motion-layer — a view-triggered reveal (IntersectionObserver).
 * Eased fade + translate on scroll-into-view; never a hard pop. Honors
 * prefers-reduced-motion (renders the final state immediately, no transition).
 *
 * Use for content below the fold; for first-paint above-the-fold use `.stagger-fade`
 * / `.fade-up` (they fire on mount without waiting for an observer).
 */
export const AnimateIn = React.forwardRef<HTMLDivElement, AnimateInProps>(
  (
    {
      direction = "up",
      delay = 0,
      distance = 16,
      repeat = false,
      as,
      className,
      style,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const Comp = (as ?? "div") as React.ElementType;
    const innerRef = React.useRef<HTMLDivElement | null>(null);
    const [visible, setVisible] = React.useState(false);
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    React.useEffect(() => {
      if (prefersReduced) {
        setVisible(true);
        return;
      }
      const el = innerRef.current;
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisible(true);
              if (!repeat) observer.unobserve(entry.target);
            } else if (repeat) {
              setVisible(false);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, [prefersReduced, repeat]);

    const offset =
      direction === "none" ? 0 : direction === "down" ? -distance : distance;

    return (
      <Comp
        ref={(node: HTMLDivElement) => {
          innerRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        className={cn(className)}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : `translateY(${offset}px)`,
          transition: prefersReduced
            ? "none"
            : "opacity 0.45s cubic-bezier(0.23,1,0.32,1), transform 0.45s cubic-bezier(0.23,1,0.32,1)",
          transitionDelay: prefersReduced ? "0ms" : `${delay}ms`,
          willChange: visible ? "auto" : "opacity, transform",
          ...style,
        }}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
AnimateIn.displayName = "AnimateIn";
