// DEV-ONLY no-auth visual harness for the C3 pay-and-book CUSTOMER-FACING surfaces
// (launch-ready-loop §7): the post-checkout return pages (PaymentSuccess /
// PaymentCancelled, also reached via /booking-success and /booking-cancelled) and
// the NoShowCalculator (no-show fee calculator). These are the surfaces a real
// end-customer (or a blog reader) touches; they are pure-presentational + i18n via
// t(), so we mount the REAL pages/components. Not in the production build (rollup
// input is index.html only; verified absent from dist/).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import '@/i18n'; // bootstrap i18n so NL renders in this standalone harness
import PaymentSuccess from '@/pages/PaymentSuccess';
import PaymentCancelled from '@/pages/PaymentCancelled';
import { NoShowCalculator } from '@/components/blog/NoShowCalculator';
import { BookingPaymentForm } from '@/components/booking/BookingPaymentForm';

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <div className="mx-auto mb-3 flex max-w-3xl items-center gap-3 px-4">
        <span className="text-xs uppercase tracking-wide text-white/70">{label}</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      {children}
    </section>
  );
}

function Harness() {
  return (
    <MemoryRouter>
      <div className="dark min-h-screen bg-[#0a0f1a]">
        <Section label="Payment success (return page)">
          <PaymentSuccess />
        </Section>
        <Section label="Payment cancelled (return page)">
          <PaymentCancelled />
        </Section>
        <Section label="Pay-link checkout (BookingPaymentForm, public booking page)">
          {/* Mounts the REAL pay-link checkout shell. With mock booking data the
              create-booking-payment call resolves to the error state, which exercises
              the premium error card + role=alert (the visual shell is what we grade). */}
          <div className="flex justify-center px-4 text-white">
            <BookingPaymentForm
              booking={{ id: 'preview-booking', calendar_id: 'preview-cal', confirmation_token: 'preview-token' }}
              serviceName="Haircut & Style"
              onPaid={() => {}}
            />
          </div>
        </Section>

        <Section label="No-show calculator (blog)">
          <div className="mx-auto max-w-3xl px-4">
            <NoShowCalculator />
          </div>
        </Section>
      </div>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
