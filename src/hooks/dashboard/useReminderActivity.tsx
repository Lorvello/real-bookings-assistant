import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMockDataControl } from '@/hooks/useMockDataControl';

// SEQP1R6 (P1-7): owner-facing reminder status. Window = last 7 days. Chosen over 30
// because reminders are a short-lived operational signal (did the last few sends work),
// not a historical trend the owner needs a month of context for; the retry ceiling itself
// is ~1 hour (12 attempts @ 5 min, see SEQP1R3), so anything past a week is stale noise.
// A 30-day toggle can be added later if owners ask for a longer look-back.
export const REMINDER_ACTIVITY_WINDOW_DAYS = 7;

export type ReminderChannel = 'email' | 'whatsapp';
// SEQP1R19 (finding R18-1) + SEQP1R31 (finding R30-1) + SEQP1R38 (finding R37-1) +
// SEQP1R45 (finding R44-1): the full live status union. booking_reminders_sent's CHECK
// constraint is exactly these EIGHT values. The prior type listed only the first three, so
// the terminal FAILURE states were a silent type lie (`row.status as ReminderStatus`) AND
// were absent from every count tile, giving the owner zero numeric signal that a reminder
// permanently failed. All terminal-failure states are now first-class members of the union
// and the count model. `payment_refunded` (SEQP1R31): a Stripe refund (full or partial) on
// the booking, reminders correctly stopped, booking status itself untouched (Mathew's
// decision). `stripe_check_failed` (SEQP1R38): the live send-time Stripe refund-check itself
// errored/timed out repeatedly (hit the retry cap) -- distinct from pending_template_approval
// (a WhatsApp-Meta-approval-specific wait) since this can happen on the email channel too and
// has nothing to do with WhatsApp template approval. `email_send_failed` (SEQP1R45): an
// email-channel send exception (network error, Resend rejection, timeout, quota exhaustion)
// that has hit the retry cap -- before this fix, an email exception silently skipped the
// attempt-accounting RPC entirely, so attempt_count froze and this state could never be
// reached; the reminder simply retried forever with zero owner-visible signal (R44-1).
export type ReminderStatus =
  | 'sent'
  | 'pending'
  | 'pending_template_approval'
  | 'invalid_phone_format'
  | 'booking_cancelled'
  | 'payment_refunded'
  | 'stripe_check_failed'
  | 'email_send_failed';

// The terminal statuses that mean a reminder will NEVER reach the customer and needs a
// human to look (fix the phone number, acknowledge the cancellation, acknowledge the
// refund, check Stripe connectivity, or investigate an email delivery failure). Folded into
// one owner-facing "failed / needs attention" count, kept distinct from `stuck`
// (pending_template_approval, which still auto-retries) and `pending` (still in flight).
export const FAILED_REMINDER_STATUSES: ReminderStatus[] = ['invalid_phone_format', 'booking_cancelled', 'payment_refunded', 'stripe_check_failed', 'email_send_failed'];

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
  sent_at: string;
  status: ReminderStatus;
  attempt_count: number;
  customer_name: string;
  start_time: string;
  // Derived, not stored: booking_reminders_sent has no channel column of its own.
  // A row with a customer_email present on the booking is an email reminder; a
  // WhatsApp-origin (no-email) booking's reminder is a whatsapp reminder (matches
  // the process-booking-reminders edge function's own channel branch, SEQP1R3/R4).
  channel: ReminderChannel;
}

export interface ReminderActivitySummary {
  sent: number;
  pending: number;
  stuck: number; // status = pending_template_approval (auto-retries, then waits on WhatsApp approval)
  failed: number; // status in FAILED_REMINDER_STATUSES (permanently failed, needs a human)
  items: ReminderActivityItem[];
  window_days: number;
}

// Pure count model, extracted so the aggregation can be unit-tested independently of the
// supabase query (R18-1 regression guard). EVERY live status must land in exactly one bucket:
// the two terminal FAILURE states (invalid_phone_format, booking_cancelled) fold into `failed`,
// so no status is ever silently omitted from the owner's headline counts again.
export function summarizeReminderItems(items: ReminderActivityItem[]): ReminderActivitySummary {
  return {
    sent: items.filter((i) => i.status === 'sent').length,
    pending: items.filter((i) => i.status === 'pending').length,
    stuck: items.filter((i) => i.status === 'pending_template_approval').length,
    failed: items.filter((i) => FAILED_REMINDER_STATUSES.includes(i.status)).length,
    window_days: REMINDER_ACTIVITY_WINDOW_DAYS,
    items,
  };
}

export function useReminderActivity(calendarIds: string[]) {
  const { useMockData } = useMockDataControl();

  return useQuery({
    queryKey: ['reminder-activity', calendarIds],
    queryFn: async (): Promise<ReminderActivitySummary | null> => {
      if (!calendarIds || calendarIds.length === 0) return null;

      if (useMockData) {
        return {
          sent: 4,
          pending: 1,
          stuck: 0,
          failed: 0,
          window_days: REMINDER_ACTIVITY_WINDOW_DAYS,
          items: [
            {
              id: 'sample-1',
              booking_id: 'sample-booking-1',
              reminder_number: 1,
              sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              status: 'sent',
              attempt_count: 1,
              customer_name: 'Emma van der Berg',
              start_time: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
              channel: 'email',
            },
          ],
        };
      }

      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - REMINDER_ACTIVITY_WINDOW_DAYS);

      // RLS (SEQP1R6) already scopes this to the caller's own tenant; the calendarIds
      // filter (via the bookings!inner embed) further narrows to whichever calendar(s)
      // are selected in the dashboard's own calendar switcher, matching every sibling
      // dashboard hook's own scoping convention.
      const { data, error } = await supabase
        .from('booking_reminders_sent')
        .select(
          `
          id,
          booking_id,
          reminder_number,
          sent_at,
          status,
          attempt_count,
          bookings!inner(customer_name, customer_email, start_time, calendar_id)
        `
        )
        .gte('sent_at', windowStart.toISOString())
        .in('bookings.calendar_id', calendarIds)
        .order('sent_at', { ascending: false });

      if (error) {
        console.error('Error fetching reminder activity:', error);
        throw error;
      }

      const rows = data || [];

      const items: ReminderActivityItem[] = rows.map((row: any) => ({
        id: row.id,
        booking_id: row.booking_id,
        reminder_number: row.reminder_number,
        sent_at: row.sent_at,
        status: row.status as ReminderStatus,
        attempt_count: row.attempt_count,
        customer_name: row.bookings?.customer_name || '',
        start_time: row.bookings?.start_time || row.sent_at,
        channel: row.bookings?.customer_email ? 'email' : 'whatsapp',
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
