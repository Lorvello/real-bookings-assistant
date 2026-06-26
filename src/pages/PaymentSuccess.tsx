import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Customer-facing page reached after a successful Stripe payment for a booking
 * (whatsapp-payment-handler / installment flows redirect here). End customers
 * have no account/dashboard: this is a simple, premium confirmation that
 * matches the public booking page.
 */
export default function PaymentSuccess() {
  const { t } = useTranslation('payment');
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0f1a] px-4 text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-70"
        style={{
          background:
            'radial-gradient(60% 80% at 50% 0%, hsl(150 69% 45% / 0.18), transparent 70%)',
        }}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.025] px-8 py-10 text-center shadow-2xl shadow-black/40 backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30">
          <CheckCircle2 aria-hidden="true" className="h-9 w-9 text-primary" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">{t('payment.success.title', 'Payment successful')}</h1>
        <p className="mt-2 text-sm text-white/55">
          {t('payment.success.body', "Your payment has been received and your appointment is confirmed. You'll receive a confirmation by email.")}
        </p>
        <p className="mt-6 text-xs text-white/35">{t('payment.success.closeHint', 'You can close this window.')}</p>
      </div>
    </div>
  );
}
