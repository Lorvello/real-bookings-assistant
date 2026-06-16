import * as React from "react";
import { CheckCircle2, Clock, XCircle, AlertTriangle, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * DESIGN_SPEC §7.4 — Status pill. The booking-state language of the whole app.
 * Status is read by icon + label + hue intensity (green=confirmed, gold=pending/
 * attention, red=error/cancelled), NOT by a competing cool color (SPEC §1).
 * Same family, so the app stays mono-accent and reads premium.
 */
export type BookingStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "attention"
  | "neutral";

const STATUS_MAP: Record<
  BookingStatus,
  { label: string; Icon: React.ComponentType<{ className?: string }>; classes: string }
> = {
  confirmed: {
    label: "Confirmed",
    Icon: CheckCircle2,
    classes: "bg-success/10 text-success-foreground",
  },
  pending: {
    label: "Pending",
    Icon: Clock,
    classes: "bg-gold/10 text-gold-foreground",
  },
  cancelled: {
    label: "Cancelled",
    Icon: XCircle,
    classes: "bg-destructive/10 text-destructive-foreground",
  },
  attention: {
    label: "Needs attention",
    Icon: AlertTriangle,
    classes: "bg-warning/10 text-warning-foreground",
  },
  neutral: {
    label: "Draft",
    Icon: Circle,
    classes: "bg-white/[0.05] text-muted-foreground",
  },
};

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: BookingStatus;
  /** override the default label for this status */
  label?: string;
}

export function StatusPill({ status, label, className, ...props }: StatusPillProps) {
  const { label: defaultLabel, Icon, classes } = STATUS_MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-0.5 text-xs font-medium",
        classes,
        className,
      )}
      {...props}
    >
      <Icon className="h-3 w-3" />
      {label ?? defaultLabel}
    </span>
  );
}
