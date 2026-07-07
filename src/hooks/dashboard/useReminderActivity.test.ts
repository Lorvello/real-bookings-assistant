import { describe, it, expect } from 'vitest';
import {
  summarizeReminderItems,
  FAILED_REMINDER_STATUSES,
  REMINDER_ACTIVITY_WINDOW_DAYS,
  type ReminderActivityItem,
  type ReminderStatus,
} from './useReminderActivity';

// SEQP1R19 (finding R18-1) + SEQP1R31 (finding R30-1) + SEQP1R38 (finding R37-1): the
// owner-facing count model must account for EVERY live reminder status. Before R19, only
// sent/pending/stuck were counted, so the terminal FAILURE states (invalid_phone_format,
// booking_cancelled) were silently omitted from every tile: a permanently failed reminder
// gave the owner zero numeric signal. R31 adds a third terminal failure state,
// payment_refunded (a Stripe refund stopped the reminder). R38 adds a fourth,
// stripe_check_failed (the live send-time Stripe refund-check itself errored/timed out
// repeatedly). These guard that each status lands in exactly one bucket and that all four
// failure states fold into `failed`.
function item(status: ReminderStatus, id: string): ReminderActivityItem {
  return {
    id,
    booking_id: `booking-${id}`,
    reminder_number: 1,
    sent_at: new Date().toISOString(),
    status,
    attempt_count: 1,
    customer_name: `Customer ${id}`,
    start_time: new Date().toISOString(),
    channel: 'email',
  };
}

describe('summarizeReminderItems (R18-1 + R31 + R38 count model)', () => {
  it('counts one of every live status, folding the four failure states into `failed`', () => {
    const items = [
      item('sent', 'a'),
      item('pending', 'b'),
      item('pending_template_approval', 'c'),
      item('invalid_phone_format', 'd'),
      item('booking_cancelled', 'e'),
      item('payment_refunded', 'f'),
      item('stripe_check_failed', 'g'),
    ];
    const s = summarizeReminderItems(items);
    expect(s.sent).toBe(1);
    expect(s.pending).toBe(1);
    expect(s.stuck).toBe(1);
    expect(s.failed).toBe(4); // invalid_phone_format + booking_cancelled + payment_refunded + stripe_check_failed
    expect(s.window_days).toBe(REMINDER_ACTIVITY_WINDOW_DAYS);
    expect(s.items).toHaveLength(7);
  });

  it('accounts for every item across the tiles (no status silently dropped)', () => {
    const items = [
      item('sent', 'a'),
      item('sent', 'b'),
      item('invalid_phone_format', 'c'),
      item('booking_cancelled', 'd'),
      item('payment_refunded', 'e'),
      item('stripe_check_failed', 'g'),
      item('pending', 'f'),
    ];
    const s = summarizeReminderItems(items);
    // The four count buckets together must equal the total number of items: nothing omitted.
    expect(s.sent + s.pending + s.stuck + s.failed).toBe(items.length);
  });

  it('reports zeroes for an empty window', () => {
    const s = summarizeReminderItems([]);
    expect(s).toMatchObject({ sent: 0, pending: 0, stuck: 0, failed: 0 });
    expect(s.items).toHaveLength(0);
  });

  it('FAILED_REMINDER_STATUSES contains exactly the four terminal failure states', () => {
    expect([...FAILED_REMINDER_STATUSES].sort()).toEqual(['booking_cancelled', 'invalid_phone_format', 'payment_refunded', 'stripe_check_failed']);
  });
});
