import * as React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { CountUp } from "@/components/ui/CountUp";

/**
 * DESIGN_SPEC §0 + §7.8 — the KPI stat, and the app's SIGNATURE in its `hero` variant.
 *
 * Premium tells (ELEVATION §4): big-and-small on one surface (huge tabular number +
 * tiny uppercase eyebrow), tight negative tracking, count-up on first view, a green/red
 * delta that reads at a glance.
 *
 * The `hero` variant is the glowing "Today" panel (the one sanctioned bold move,
 * SPEC §0 / ELEVATION §9.7): `.surface-raised` + `.glow-accent-strong` so it emits the
 * accent light. On the Dashboard the page also places an ambient orb BEHIND it so the
 * panel becomes the literal light source of the canvas; the primitive supplies the panel,
 * the page supplies the page-level haze.
 */
export interface KpiStatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** percentage change vs previous period; positive renders green-up, negative red-down */
  delta?: number;
  /** context for the delta, e.g. "vs last week" */
  deltaLabel?: string;
  /** tiny bar sparkline (values 0..1 relative); draws up on view via .bar-grow */
  sparkline?: number[];
  icon?: React.ReactNode;
  variant?: "default" | "hero";
}

export const KpiStat = React.forwardRef<HTMLDivElement, KpiStatProps>(
  (
    {
      label,
      value,
      decimals = 0,
      prefix,
      suffix,
      delta,
      deltaLabel,
      sparkline,
      icon,
      variant = "default",
      className,
      ...props
    },
    ref,
  ) => {
    const isHero = variant === "hero";
    const deltaUp = (delta ?? 0) >= 0;
    return (
      <div
        ref={ref}
        className={cn(
          "surface-raised rounded-xl",
          isHero ? "glow-accent-strong p-6" : "p-5",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between">
          <p className="text-eyebrow uppercase text-subtle-foreground">{label}</p>
          {icon ? <span className="text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span> : null}
        </div>

        <div className="mt-3 flex items-end gap-3">
          <span
            className={cn(
              "tabular-nums text-foreground",
              isHero ? "text-display-hero" : "text-display",
            )}
            data-numeric
          >
            {prefix}
            <CountUp value={value} decimals={decimals} />
            {suffix}
          </span>

          {typeof delta === "number" ? (
            <span
              className={cn(
                "mb-1 inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
                deltaUp ? "text-success-foreground" : "text-destructive-foreground",
              )}
            >
              {deltaUp ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {Math.abs(delta)}%
            </span>
          ) : null}
        </div>

        {deltaLabel ? (
          <p className="mt-1 text-xs text-subtle-foreground">{deltaLabel}</p>
        ) : null}

        {sparkline && sparkline.length > 0 ? (
          <div className="mt-4 flex h-10 items-end gap-1">
            {sparkline.map((v, i) => (
              <span
                key={i}
                className="bar-grow flex-1 rounded-sm bg-gradient-to-t from-primary/30 to-primary/70"
                style={{ height: `${Math.max(6, Math.min(100, v * 100))}%`, animationDelay: `${i * 40}ms` }}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  },
);
KpiStat.displayName = "KpiStat";
