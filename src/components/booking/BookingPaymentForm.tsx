import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { getPublishableKeyForMode } from '@/utils/stripeConfig';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';

interface BookingPaymentFormProps {
  booking: { id: string; calendar_id: string; confirmation_token: string };
  serviceName?: string;
  onPaid: () => void;
}

// Raw Stripe.js (no @stripe/react-stripe-js needed) Payment Element checkout for
// the public booking page. The PaymentIntent is created server-side by
// create-booking-payment, which pins the Stripe mode and returns it so we load the
// matching publishable key and exactly the owner's enabled, currency-compatible
// payment methods. On success the stripe-webhook confirms the booking and sends
// the confirmation email.
export function BookingPaymentForm({ booking, serviceName, onPaid }: BookingPaymentFormProps) {
  const { t } = useTranslation('publicBooking');
  const paymentElementRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const mountedPaymentElementRef = useRef<StripePaymentElement | null>(null);

  const [status, setStatus] = useState<'init' | 'ready' | 'paying' | 'processing' | 'error'>('init');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1. Create the PaymentIntent (server pins the mode + returns it).
        const { data, error: invErr } = await supabase.functions.invoke('create-booking-payment', {
          body: {
            booking_id: booking.id,
            calendar_id: booking.calendar_id,
            confirmation_token: booking.confirmation_token,
          },
        });
        if (invErr || !data?.success || !data.client_secret) {
          throw new Error(data?.error || t('publicBooking.pay.errStart', 'Could not start the payment.'));
        }

        // 2. Load Stripe with the publishable key matching the server's mode.
        const stripe = await loadStripe(getPublishableKeyForMode(data.mode === 'live' ? 'live' : 'test'));
        if (!stripe || cancelled) return;

        // 3. Mount the Payment Element using the server-created intent. Unlike the
        // old Card Element, this can complete iDEAL and other configured redirect
        // methods without silently ignoring the owner's payment-method settings.
        const elements = stripe.elements({
          clientSecret: data.client_secret,
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#22c55e',
              colorBackground: '#101827',
              colorText: '#ffffff',
              colorDanger: '#f87171',
              borderRadius: '12px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            },
          },
        });
        const paymentElement = elements.create('payment', { layout: 'tabs' });
        if (paymentElementRef.current) paymentElement.mount(paymentElementRef.current);

        stripeRef.current = stripe;
        elementsRef.current = elements;
        mountedPaymentElementRef.current = paymentElement;
        if (!cancelled) setStatus('ready');
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error && e.message
            ? e.message
            : t('publicBooking.pay.errStartRetry', 'Could not start the payment. Please try again.'));
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
      try { mountedPaymentElementRef.current?.unmount(); } catch { /* noop */ }
    };
  }, [booking.id, booking.calendar_id, booking.confirmation_token, t]);

  const pay = async () => {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) return;

    setStatus('paying');
    setError(null);
    const { error: payErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
      redirect: 'if_required',
    });

    if (payErr) {
      setError(payErr.message || t('publicBooking.pay.errFailed', 'Payment failed. Please check your card details.'));
      setStatus('error');
      return;
    }
    if (paymentIntent?.status === 'succeeded') {
      onPaid();
    } else if (paymentIntent?.status === 'processing') {
      setStatus('processing');
    } else {
      setError(t('publicBooking.pay.errNotCompleted', 'Payment not completed. Please try again.'));
      setStatus('error');
    }
  };

  return (
    <div className="mt-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
      <div className="flex flex-col items-center px-8 pt-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30">
          <Lock aria-hidden="true" className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">{t('publicBooking.pay.title', 'Pay to confirm')}</h1>
        <p className="mt-1.5 text-sm text-white/50">
          {serviceName ? t('publicBooking.pay.completeWithService', 'Complete the payment for {{service}} to confirm your appointment.', { service: serviceName }) : t('publicBooking.pay.complete', 'Complete the payment to confirm your appointment.')}
        </p>
      </div>

      <div className="px-8 py-6">
        {status === 'init' && (
          <div className="flex items-center justify-center py-6 text-white/50">
            <Loader2 aria-label={t('publicBooking.pay.loading', 'Loading')} className="h-5 w-5 animate-spin" />
          </div>
        )}

        {/* Card Element mounts here (kept rendered so the ref exists once ready). */}
        <div className={status === 'init' ? 'hidden' : ''}>
          <div
            ref={paymentElementRef}
            className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-3"
          />
          {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
          {status === 'processing' && (
            <p role="status" className="mt-2 text-sm text-white/65">
              {t('publicBooking.pay.processing', 'Your payment is processing. You may close this page after receiving confirmation.')}
            </p>
          )}
          <Button
            onClick={pay}
            disabled={status === 'paying' || status === 'processing' || status === 'init'}
            className="mt-4 w-full"
            size="lg"
          >
            {status === 'paying' ? (
              <><Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> {t('publicBooking.pay.paying', 'Paying…')}</>
            ) : (
              t('publicBooking.pay.payNow', 'Pay now')
            )}
          </Button>
          <p className="mt-3 text-center text-xs text-white/55">
            {t('publicBooking.pay.securedBy', 'Secured by Stripe. Your card details never touch our servers.')}
          </p>
        </div>
      </div>
    </div>
  );
}
