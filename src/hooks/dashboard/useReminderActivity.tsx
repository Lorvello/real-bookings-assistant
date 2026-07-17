import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMockDataControl } from "@/hooks/useMockDataControl";

// SEQP1R6 (P1-7): owner-facing reminder status. Window = last 7 days. Chosen over 30
// because reminders are a short-lived operational signal (did the last few sends work),
// not a historical trend the owner needs a month of context for; the retry ceiling itself
// is ~1 hour (12 attempts @ 5 min, see SEQP1R3), so anything past a week is stale noise.
// A 30-day toggle can be added later if owners ask for a longer look-back.
export const REMINDER_ACTIVITY_WINDOW_DAYS = 7;

export type ReminderChannel = "email" | "whatsapp";
export type ReminderPostAcceptanceState =
  "booking_cancelled" | "payment_refunded" | "schedule_superseded";
// R28 distinguishes provider acceptance from actual delivery. `sent` is deliberately absent:
// legacy rows are migrated to either provider_accepted (provider receipt exists) or
// legacy_unverified (no trustworthy receipt). `recorded` is also absent because this hook
// filters delivery_mode=send; local/test record-only evidence must never appear as a send.
export type ReminderStatus =
  | "provider_accepted"
  | "delivered"
  | "legacy_unverified"
  | "pending"
  | "pending_template_approval"
  | "invalid_phone_format"
  | "booking_cancelled"
  | "payment_refunded"
  | "stripe_check_failed"
  | "email_send_failed"
  | "whatsapp_send_failed"
  | "whatsapp_configuration_missing"
  | "delivery_unknown"
  | "no_contact_info"
  | "superseded";

// The terminal statuses that mean a reminder will NEVER reach the customer and needs a
// human to look (fix the phone number, acknowledge the cancellation, acknowledge the
// refund, check Stripe connectivity, investigate an email delivery failure, or restore a
// customer's contact info). Folded into one owner-facing "failed / needs attention" count,
// kept distinct from `stuck` (pending_template_approval, which still auto-retries) and
// `pending` (still in flight).
export const FAILED_REMINDER_STATUSES: ReminderStatus[] = [
  "legacy_unverified",
  "invalid_phone_format",
  "booking_cancelled",
  "payment_refunded",
  "stripe_check_failed",
  "email_send_failed",
  "whatsapp_send_failed",
  "whatsapp_configuration_missing",
  "delivery_unknown",
  "no_contact_info",
];

export const SUPPRESSED_REMINDER_STATUSES: ReminderStatus[] = ["superseded"];

// SEQP1R45 (finding R44-1, dashboard-truthfulness half): the owner-facing mirror of
// WHATSAPP_REMINDER_MAX_ATTEMPTS in supabase/functions/process-booking-reminders/index.ts.
// Duplicated on purpose (same convention as REMINDER_ACTIVITY_WINDOW_DAYS above): the two
// values must be kept in sync by hand if the backend cap ever changes, there is no shared
// runtime between an edge function and the dashboard bundle. Used to show "attempt N of 12"
// per item so a reminder that has been retried many times is visibly distinct from one that
// just got claimed, instead of both looking identical inside the same `pending` bucket.
export const REMINDER_MAX_ATTEMPTS = 12;

export interface ReminderActivityItem {
  id: string;
  booking_id: string;
  reminder_number: number;
  sent_at: string | null;
  activity_at: string;
  status: ReminderStatus;
  post_acceptance_state: ReminderPostAcceptanceState | null;
  attempt_count: number;
  customer_name: string;
  start_time: string;
  // SEQP1R55 (sibling of finding R54-1): sourced from booking_reminders_sent.channel, the
  // channel actually attempted at claim/send time, persisted once and never re-derived from
  // the booking's current, mutable contact state. Before this fix, the channel was derived
  // from row.bookings.customer_email on every render, so a contact edit made AFTER a real
  // send would retroactively mislabel that past send's icon (R54's "vectors checked"
  // section). Rows written before this migration have no persisted channel; those alone
  // still fall back to the old current-state derivation (best-effort for historical data
  // only, see the mapping below).
  channel: ReminderChannel;
}

export interface ReminderActivitySummary {
  accepted: number; // provider accepted, or a later provider delivery receipt confirmed
  pending: number;
  stuck: number; // status = pending_template_approval (auto-retries, then waits on WhatsApp approval)
  failed: number; // status in FAILED_REMINDER_STATUSES (permanently failed, needs a human)
  suppressed: number; // an older schedule was safely replaced before provider I/O
  items: ReminderActivityItem[];
  window_days: number;
}

interface ReminderActivityQueryRow {
  id: string;
  booking_id: string;
  reminder_number: number;
  sent_at: string | null;
  created_at: string;
  last_attempted_at: string | null;
  resolved_at: string | null;
  status: string;
  post_acceptance_state: string | null;
  scheduled_for: string | null;
  customer_name_snapshot: string | null;
  attempt_count: number;
  channel: string | null;
  bookings: {
    customer_name: string;
    customer_email: string | null;
    start_time: string;
  } | null;
}

function reminderPostAcceptanceState(
  value: string | null,
): ReminderPostAcceptanceState | null {
  switch (value) {
    case "booking_cancelled":
    case "payment_refunded":
    case "schedule_superseded":
      return value;
    default:
      return null;
  }
}

// Pure count model, extracted so the aggregation can be unit-tested independently of the
// supabase query (R18-1 regression guard). EVERY live status must land in exactly one bucket:
// the two terminal FAILURE states (invalid_phone_format, booking_cancelled) fold into `failed`,
// so no status is ever silently omitted from the owner's headline counts again.
export function summarizeReminderItems(
  items: ReminderActivityItem[],
): ReminderActivitySummary {
  return {
    accepted: items.filter(
      (i) => i.status === "provider_accepted" || i.status === "delivered",
    ).length,
    pending: items.filter((i) => i.status === "pending").length,
    stuck: items.filter((i) => i.status === "pending_template_approval").length,
    failed: items.filter((i) => FAILED_REMINDER_STATUSES.includes(i.status))
      .length,
    suppressed: items.filter((i) =>
      SUPPRESSED_REMINDER_STATUSES.includes(i.status),
    ).length,
    window_days: REMINDER_ACTIVITY_WINDOW_DAYS,
    items,
  };
}

export function useReminderActivity(calendarIds: string[]) {
  const { useMockData } = useMockDataControl();

  return useQuery({
    queryKey: ["reminder-activity", calendarIds],
    queryFn: async (): Promise<ReminderActivitySummary | null> => {
      if (!calendarIds || calendarIds.length === 0) return null;

      if (useMockData) {
        return {
          accepted: 4,
          pending: 1,
          stuck: 0,
          failed: 0,
          suppressed: 0,
          window_days: REMINDER_ACTIVITY_WINDOW_DAYS,
          items: [
            {
              id: "sample-1",
              booking_id: "sample-booking-1",
              reminder_number: 1,
              sent_at: null,
              activity_at: new Date(
                Date.now() - 2 * 60 * 60 * 1000,
              ).toISOString(),
              status: "provider_accepted",
              post_acceptance_state: null,
              attempt_count: 1,
              customer_name: "Emma van der Berg",
              start_time: new Date(
                Date.now() + 22 * 60 * 60 * 1000,
              ).toISOString(),
              channel: "email",
            },
          ],
        };
      }

      const windowStart = new Date();
      windowStart.setDate(
        windowStart.getDate() - REMINDER_ACTIVITY_WINDOW_DAYS,
      );

      // RLS (SEQP1R6) already scopes this to the caller's own tenant; the calendarIds
      // filter (via the bookings!inner embed) further narrows to whichever calendar(s)
      // are selected in the dashboard's own calendar switcher, matching every sibling
      // dashboard hook's own scoping convention.
      const { data, error } = await supabase
        .from("booking_reminders_sent")
        .select(
          `
          id,
          booking_id,
          reminder_number,
          sent_at,
          created_at,
          last_attempted_at,
          resolved_at,
          scheduled_for:booking_start_time_snapshot,
          customer_name_snapshot,
          post_acceptance_state,
          delivery_mode,
          status,
          attempt_count,
          channel,
          bookings!inner(customer_name, customer_email, start_time, calendar_id)
        `,
        )
        .eq("delivery_mode", "send")
        .gte("created_at", windowStart.toISOString())
        .in("bookings.calendar_id", calendarIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching reminder activity:", error);
        throw error;
      }

      const rows = data || [];

      const items: ReminderActivityItem[] = (
        rows as unknown as ReminderActivityQueryRow[]
      ).map((row) => ({
        id: row.id,
        booking_id: row.booking_id,
        reminder_number: row.reminder_number,
        sent_at: row.sent_at,
        activity_at: row.last_attempted_at || row.resolved_at || row.created_at,
        // Provider acceptance is immutable evidence. Later cancellation, refund, or
        // rescheduling remains a separate annotation instead of rewriting that receipt.
        status: row.status as ReminderStatus,
        post_acceptance_state: reminderPostAcceptanceState(
          row.post_acceptance_state,
        ),
        attempt_count: row.attempt_count,
        // Keep accepted history attached to the customer identity captured at claim time.
        // Current booking data may have been edited or redacted after provider acceptance.
        customer_name:
          row.customer_name_snapshot || row.bookings?.customer_name || "",
        // The joined booking is mutable and may already point at a newer generation. Prefer
        // the claim-time snapshot so historical activity remains attached to its own schedule.
        start_time:
          row.scheduled_for || row.bookings?.start_time || row.created_at,
        // SEQP1R55: prefer the persisted send-time channel. Only a row written before this
        // migration (no channel value yet) falls back to deriving from current contact state,
        // exactly the prior (now-fixed) behavior, kept solely so old rows still show something
        // sensible rather than a raw null.
        channel:
          row.channel === "email" || row.channel === "whatsapp"
            ? row.channel
            : row.bookings?.customer_email
              ? "email"
              : "whatsapp",
      }));

      return summarizeReminderItems(items);
    },
    enabled: !!calendarIds && calendarIds.length > 0,
    staleTime: 30000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}
