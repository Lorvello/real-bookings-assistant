import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { useReminderActivityMock } = vi.hoisted(() => ({
  useReminderActivityMock: vi.fn(),
}));

vi.mock("@/hooks/dashboard/useReminderActivity", async () => {
  const actual = await vi.importActual<
    typeof import("@/hooks/dashboard/useReminderActivity")
  >("@/hooks/dashboard/useReminderActivity");
  return { ...actual, useReminderActivity: useReminderActivityMock };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
    i18n: { language: "en" },
  }),
}));

import { ReminderActivityCard } from "./ReminderActivityCard";

describe("ReminderActivityCard historical acceptance annotations", () => {
  it("shows provider acceptance and a later reschedule as two separate truths", () => {
    useReminderActivityMock.mockReturnValue({
      data: {
        accepted: 1,
        pending: 0,
        stuck: 0,
        failed: 0,
        suppressed: 0,
        window_days: 7,
        items: [
          {
            id: "reminder-1",
            booking_id: "booking-1",
            reminder_number: 1,
            sent_at: null,
            activity_at: "2026-07-17T08:00:00.000Z",
            status: "provider_accepted",
            post_acceptance_state: "schedule_superseded",
            attempt_count: 1,
            customer_name: "Claim-time customer",
            start_time: "2026-07-18T08:00:00.000Z",
            channel: "email",
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ReminderActivityCard calendarIds={["calendar-1"]} />);

    expect(screen.getByText("Claim-time customer")).toBeInTheDocument();
    expect(screen.getByText("Provider accepted")).toBeInTheDocument();
    expect(
      screen.getByText("Rescheduled after acceptance"),
    ).toBeInTheDocument();
  });
});
