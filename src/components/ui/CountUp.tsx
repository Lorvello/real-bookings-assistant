import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  /** the final numeric value to animate to */
  value: number;
  /** decimal places to render (default 0) */
  decimals?: number;
  /** animation duration in ms (default 700) */
  duration?: number;
  className?: string;
}

/**
 * ELEVATION §6 — KPI numbers animate up on first view (eased, premium "settling"),
 * never a frozen number. Respects prefers-reduced-motion (renders the final value).
 * Only animates once on mount; subsequent value changes snap (no odometer on revisit).
 */
export function CountUp({ value, decimals = 0, duration = 700, className }: CountUpProps) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const [display, setDisplay] = useState(prefersReduced ? value : 0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (prefersReduced || startedRef.current) {
      setDisplay(value);
      return;
    }
    startedRef.current = true;
    const start = performance.now();
    const from = 0;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic-bezier(0.23,1,0.32,1)-ish
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <span className={className}>{display.toFixed(decimals)}</span>;
}
