import * as React from "react";

import { BookingsList } from "@/components/bookings/BookingsList";

/**
 * GOAL_PROMPT_high_end_fluid.md §3a — the dev-only VISUAL HARNESS.
 * No auth, no backend: it mounts the REAL logged-in list/row components (not copies, so
 * no drift) with representative MOCK props, so the high-end-fluid loop can screenshot +
 * grade data-rich surfaces (Bookings, Conversations, ...) that render empty on the real
 * account. REMOVE this file + its /preview-harness route before the final push (DoD §8).
 *
 * Components that take their data as PROPS (BookingsList) are rendered directly. Surfaces
 * that read context/queries get a seeded provider wrapper (added here as the loop reaches
 * them — see STATUS.md "HARNESS-RECEPT" for the context shapes + query keys).
 */

// Fixed ISO timestamps (deterministic; no reliance on "now") so screenshots are stable.
const mockBookings = [
  {
    id: "bk-1",
    calendar_id: "mock-cal",
    customer_name: "Sanne de Vries",
    customer_email: "sanne@voorbeeld.nl",
    customer_phone: "+31 6 12345678",
    start_time: "2026-06-18T14:30:00",
    end_time: "2026-06-18T15:15:00",
    status: "confirmed",
    service_name: "Knippen & kleur",
    total_price: 68,
    notes: "Allergisch voor ammonia.",
  },
  {
    id: "bk-2",
    calendar_id: "mock-cal",
    customer_name: "Mark Jansen",
    customer_email: "mark.jansen@voorbeeld.nl",
    customer_phone: "+31 6 22223333",
    start_time: "2026-06-18T16:00:00",
    end_time: "2026-06-18T16:30:00",
    status: "pending",
    service_name: "Baard trimmen",
    total_price: 22,
  },
  {
    id: "bk-3",
    calendar_id: "mock-cal",
    customer_name: "Emma van der Berg",
    customer_email: "emma@voorbeeld.nl",
    customer_phone: "+31 6 44445555",
    start_time: "2026-06-19T10:00:00",
    end_time: "2026-06-19T11:00:00",
    status: "completed",
    service_name: "Knippen & stylen",
    total_price: 45,
    notes: "Vaste klant, voorkeur voor Lisa.",
  },
  {
    id: "bk-4",
    calendar_id: "mock-cal",
    customer_name: "Tom Bakker",
    customer_email: "tom.bakker@voorbeeld.nl",
    customer_phone: "+31 6 66667777",
    start_time: "2026-06-19T13:30:00",
    end_time: "2026-06-19T14:00:00",
    status: "cancelled",
    service_name: "Knippen heren",
    total_price: 28,
  },
];

function HarnessSection({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-foreground">{title}</h2>
        {sub ? <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function PreviewHarness() {
  const noop = React.useCallback(() => {}, []);

  return (
    <div className="min-h-dvh overflow-y-auto bg-background main-scrollbar">
      <header className="border-b border-white/[0.06] px-8 py-8">
        <p className="text-eyebrow uppercase text-subtle-foreground">Bookings Assistant</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-foreground">
          Preview harness{" "}
          <span className="font-serif italic text-muted-foreground">/ surfaces</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Real logged-in components fed with mock data so data-rich surfaces can be graded
          without auth. Dev-only — removed before the final push.
        </p>
      </header>

      <div className="mx-auto max-w-4xl space-y-12 px-8 py-10">
        <HarnessSection
          title="Bookings — list (populated)"
          sub="The real BookingsList / BookingCard, four statuses (confirmed, pending, completed, cancelled)."
        >
          <BookingsList bookings={mockBookings} loading={false} hasFilters={false} onBookingClick={noop} />
        </HarnessSection>

        <HarnessSection title="Bookings — loading" sub="Exact-shape skeleton state.">
          <BookingsList bookings={[]} loading={true} hasFilters={false} onBookingClick={noop} />
        </HarnessSection>

        <HarnessSection title="Bookings — empty" sub="No bookings, no filters.">
          <BookingsList bookings={[]} loading={false} hasFilters={false} onBookingClick={noop} />
        </HarnessSection>
      </div>
    </div>
  );
}
