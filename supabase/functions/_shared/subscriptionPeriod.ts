// Resolve a Stripe Subscription's current billing-period end as an ISO string.
//
// WHY THIS EXISTS: Stripe's 2025-03-31 API release moved `current_period_start`
// and `current_period_end` OFF the Subscription object and ONTO each subscription
// item (a subscription can now have items on different billing cycles). Webhook
// event payloads are serialized with the *account default* API version (set in the
// Stripe Dashboard), NOT with the apiVersion the SDK pins for its own requests, so
// once the account is on a >=2025-03-31 version every delivered `customer.subscription.*`
// event has `subscription.current_period_end === undefined`.
//
// The old code did `new Date(subscription.current_period_end * 1000).toISOString()`,
// which on `undefined` becomes `new Date(NaN).toISOString()` and THROWS
// `RangeError: Invalid time value`. In the webhook that throw bubbled up to a 500,
// so every real SaaS subscription create/update failed to sync `public.users` +
// `public.subscribers` (the customer paid but stayed locked = split-brain).
//
// This helper reads the top-level field first (older payloads), falls back to the
// item-level field (newer payloads), and never throws: an unresolved/invalid value
// returns null so callers can decide a sane default instead of crashing the handler.
export function getCurrentPeriodEndISO(subscription: any): string | null {
  const epoch = resolvePeriodEndEpoch(subscription);
  if (epoch == null) return null;
  const ms = epoch * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

// Returns the unix-seconds period end, or null if it cannot be resolved.
export function resolvePeriodEndEpoch(subscription: any): number | null {
  if (!subscription) return null;
  // Top-level (API < 2025-03-31).
  const top = subscription.current_period_end;
  if (typeof top === 'number' && Number.isFinite(top)) return top;
  // Item-level (API >= 2025-03-31). Use the LATEST period end across items so a
  // multi-item subscription reports the furthest-out access boundary.
  const items = subscription.items?.data;
  if (Array.isArray(items) && items.length > 0) {
    const ends = items
      .map((it: any) => it?.current_period_end)
      .filter((v: any) => typeof v === 'number' && Number.isFinite(v));
    if (ends.length > 0) return Math.max(...ends);
  }
  return null;
}
