import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  summarizeReminderItems,
  FAILED_REMINDER_STATUSES,
  SUPPRESSED_REMINDER_STATUSES,
  REMINDER_ACTIVITY_WINDOW_DAYS,
  useReminderActivity,
  type ReminderActivityItem,
  type ReminderStatus,
} from "./useReminderActivity";

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: fromMock },
}));

vi.mock("@/hooks/useMockDataControl", () => ({
  useMockDataControl: () => ({ useMockData: false }),
}));

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function mockReminderRows(data: unknown[]) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.order.mockResolvedValue({ data, error: null });
  fromMock.mockReturnValue(query);

  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// R28 truth model: provider acceptance and delivery are explicit; routine supersession is
// separate from failure; every send-mode status lands in exactly one headline bucket.
function item(status: ReminderStatus, id: string): ReminderActivityItem {
  return {
    id,
    booking_id: `booking-${id}`,
    reminder_number: 1,
    sent_at: new Date().toISOString(),
    activity_at: new Date().toISOString(),
    status,
    post_acceptance_state: null,
    attempt_count: 1,
    customer_name: `Customer ${id}`,
    start_time: new Date().toISOString(),
    channel: "email",
  };
}

describe("summarizeReminderItems (R28 truthful delivery model)", () => {
  it("counts one of every send-mode status without treating provider acceptance as delivery", () => {
    const items = [
      item("provider_accepted", "a"),
      item("delivered", "b"),
      item("pending", "c"),
      item("pending_template_approval", "d"),
      item("legacy_unverified", "e"),
      item("invalid_phone_format", "f"),
      item("booking_cancelled", "g"),
      item("payment_refunded", "h"),
      item("stripe_check_failed", "i"),
      item("email_send_failed", "j"),
      item("whatsapp_send_failed", "k"),
      item("whatsapp_configuration_missing", "l"),
      item("delivery_unknown", "m"),
      item("no_contact_info", "n"),
      item("superseded", "o"),
    ];
    const s = summarizeReminderItems(items);
    expect(s.accepted).toBe(2);
    expect(s.pending).toBe(1);
    expect(s.stuck).toBe(1);
    expect(s.failed).toBe(10);
    expect(s.suppressed).toBe(1);
    expect(s.window_days).toBe(REMINDER_ACTIVITY_WINDOW_DAYS);
    expect(s.items).toHaveLength(15);
  });

  it("accounts for every item across the tiles (no status silently dropped)", () => {
    const items = [
      item("provider_accepted", "a"),
      item("delivered", "b"),
      item("invalid_phone_format", "c"),
      item("booking_cancelled", "d"),
      item("payment_refunded", "e"),
      item("stripe_check_failed", "g"),
      item("email_send_failed", "h"),
      item("whatsapp_send_failed", "i"),
      item("delivery_unknown", "j"),
      item("no_contact_info", "k"),
      item("pending", "f"),
      item("legacy_unverified", "l"),
      item("whatsapp_configuration_missing", "m"),
      item("superseded", "n"),
    ];
    const s = summarizeReminderItems(items);
    expect(s.accepted + s.pending + s.stuck + s.failed + s.suppressed).toBe(
      items.length,
    );
  });

  it("reports zeroes for an empty window", () => {
    const s = summarizeReminderItems([]);
    expect(s).toMatchObject({
      accepted: 0,
      pending: 0,
      stuck: 0,
      failed: 0,
      suppressed: 0,
    });
    expect(s.items).toHaveLength(0);
  });

  it("FAILED_REMINDER_STATUSES contains every terminal production failure state", () => {
    expect([...FAILED_REMINDER_STATUSES].sort()).toEqual([
      "booking_cancelled",
      "delivery_unknown",
      "email_send_failed",
      "invalid_phone_format",
      "legacy_unverified",
      "no_contact_info",
      "payment_refunded",
      "stripe_check_failed",
      "whatsapp_configuration_missing",
      "whatsapp_send_failed",
    ]);
    expect(SUPPRESSED_REMINDER_STATUSES).toEqual(["superseded"]);
  });
});

describe("useReminderActivity immutable schedule snapshots", () => {
  it("shows an accepted old generation at its original time and final superseded state", async () => {
    const oldScheduledFor = "2026-07-20T08:00:00.000Z";
    const currentAppointment = "2026-07-21T13:30:00.000Z";
    const query = mockReminderRows([
      {
        id: "reminder-old-generation",
        booking_id: "booking-rescheduled",
        reminder_number: 1,
        sent_at: null,
        created_at: "2026-07-19T08:00:00.000Z",
        last_attempted_at: "2026-07-19T08:01:00.000Z",
        resolved_at: "2026-07-19T08:01:01.000Z",
        status: "provider_accepted",
        post_acceptance_state: "schedule_superseded",
        scheduled_for: oldScheduledFor,
        customer_name_snapshot: "Original customer name",
        attempt_count: 1,
        channel: "email",
        bookings: {
          customer_name: "Edited current customer name",
          customer_email: "customer@example.com",
          start_time: currentAppointment,
        },
      },
    ]);

    const { result } = renderHook(() => useReminderActivity(["calendar-1"]), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items[0]).toMatchObject({
      start_time: oldScheduledFor,
      status: "provider_accepted",
      post_acceptance_state: "schedule_superseded",
      customer_name: "Original customer name",
    });
    expect(result.current.data).toMatchObject({ accepted: 1, suppressed: 0 });
    expect(query.select).toHaveBeenCalledWith(
      expect.stringContaining("scheduled_for:booking_start_time_snapshot"),
    );
    expect(query.select).toHaveBeenCalledWith(
      expect.stringContaining("post_acceptance_state"),
    );
    expect(query.select).toHaveBeenCalledWith(
      expect.stringContaining("customer_name_snapshot"),
    );
  });
});
