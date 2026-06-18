import React from 'react';
import { Badge } from '@/components/ui/badge';

/** The subscription lifecycle states that carry a visible billing badge. */
export type BillingUserType =
  | 'subscriber'
  | 'canceled_subscriber'
  | 'canceled_and_inactive'
  | 'expired_trial'
  | 'missed_payment'
  | 'trial'
  | 'setup_incomplete'
  | string;

interface PlanStatusBadgeProps {
  userType: BillingUserType;
}

/**
 * Pure presentational status pill for the Current Plan header. Active trials and
 * still-loading/unknown states intentionally render NOTHING — the "Free during
 * trial period" line communicates the trial, and a scary "Unknown" badge is never
 * surfaced. Mirrors the old inline getStatusBadge() logic, now token-driven.
 */
export function PlanStatusBadge({ userType }: PlanStatusBadgeProps) {
  switch (userType) {
    case 'subscriber':
      return <Badge className="border-success/20 bg-success/10 text-success-foreground">Active</Badge>;
    case 'canceled_subscriber':
      return <Badge className="border-warning/20 bg-warning/10 text-warning-foreground">Canceled</Badge>;
    case 'canceled_and_inactive':
      return <Badge className="border-border bg-muted text-muted-foreground">Canceled</Badge>;
    case 'expired_trial':
      return <Badge className="border-destructive/20 bg-destructive/10 text-destructive-foreground">Expired</Badge>;
    case 'missed_payment':
      return <Badge className="border-destructive/20 bg-destructive/10 text-destructive-foreground">Payment failed</Badge>;
    default:
      return null;
  }
}
