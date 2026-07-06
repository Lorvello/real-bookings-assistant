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
export type ReminderStatus = 'sent' | 'pending' | 'pending_template_approval';

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
  stuck: number; // status = pending_template_approval
  items: ReminderActivityItem[];
  window_days: number;
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

      return {
        sent: items.filter((i) => i.status === 'sent').length,
        pending: items.filter((i) => i.status === 'pending').length,
        stuck: items.filter((i) => i.status === 'pending_template_approval').length,
        window_days: REMINDER_ACTIVITY_WINDOW_DAYS,
        items,
      };
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
