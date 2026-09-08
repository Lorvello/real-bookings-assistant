import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import {
  getPublicEnterpriseClaims,
  getPublicFeatureAvailability,
} from '@/config/publicFeatureAvailability';

type VerificationState = 'verifying' | 'success' | 'error';

const displayTierName = (tierName: string | null | undefined): string | null => {
  if (tierName === 'starter') return 'Starter';
  if (tierName === 'professional') return 'Professional';
  if (tierName === 'enterprise') return 'Enterprise';
  return null;
};

export default function Success() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(['payment', 'app']);
  const { t: tHome } = useTranslation('home');
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const { invalidateCache } = useUserStatus();
  const { refetch: refetchProfile } = useProfile();
  // Cache callback identities may change after a profile update. They must not
  // restart checkout verification or its countdown for the same session.
  const refreshCallbacks = useRef({ userId, refetchProfile, invalidateCache });
  useEffect(() => {
    refreshCallbacks.current = { userId, refetchProfile, invalidateCache };
  }, [userId, refetchProfile, invalidateCache]);
  const publicFeatureAvailability = getPublicFeatureAvailability();
  const enterpriseClaims = getPublicEnterpriseClaims(publicFeatureAvailability, {
    canonical: (key, fallback) => tHome(key, fallback),
    legacy: (key, fallback) => t(key, fallback),
    surface: 'success',
  });
  const [verification, setVerification] = useState<{ key: string; state: VerificationState } | null>(null);
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const verificationKey = JSON.stringify([userId, authLoading, location.search, verificationAttempt]);
  // Hide a previous account/session result during the render that changes it,
  // before effect cleanup/reset runs.
  const verificationState: VerificationState = verification?.key === verificationKey
    ? verification.state
    : 'verifying';

  // F-036: /success wraps no DashboardLayout, so the F-035 title effect never runs
  // here and the page previously set no document.title, leaving the browser tab on
  // whatever the prior page left (or the index.html default). Mirror the F-035
  // app-peer pattern: an i18n page title + the shared `app.documentTitleSuffix`
  // brand suffix, following the EN<->NL toggle (`t` identity flips on changeLanguage).
  useEffect(() => {
    const suffix = t('app.documentTitleSuffix', { ns: 'app', defaultValue: 'Bookings Assistant' });
    const title = verificationState === 'success'
      ? t('payment.subscription.documentTitle', 'Payment Successful')
      : verificationState === 'error'
        ? t('payment.subscription.errorDocumentTitle', 'Payment Verification Failed')
        : t('payment.subscription.verifyingDocumentTitle', 'Verifying Payment');
    document.title = `${title} | ${suffix}`;
  }, [t, verificationState]);

  useEffect(() => {
    let cancelled = false;

    const verifySubscription = async () => {
      setVerification({ key: verificationKey, state: 'verifying' });
      setSubscriptionTier(null);
      setCountdown(5);

      if (authLoading) return;
      try {
        if (!userId) throw new Error('An authenticated account is required.');
        const urlParams = new URLSearchParams(location.search);
        const sessionId = urlParams.get('session_id')?.trim();
        if (!sessionId) {
          throw new Error('A checkout session_id is required.');
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;
        const accessToken = sessionData.session?.access_token;
        if (sessionError || !accessToken || sessionData.session?.user?.id !== userId) {
          throw new Error('An authenticated session is required to verify this checkout.');
        }

        const { data, error } = await supabase.functions.invoke('check-subscription-by-session', {
          body: { session_id: sessionId },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (cancelled) return;
        if (error) {
          throw new Error(error.message || 'Checkout verification failed.');
        }

        if (!data?.success || !data.subscribed || data.payment_status !== 'paid') {
          throw new Error(data?.error || 'The checkout session is not a confirmed paid subscription.');
        }

        if (!cancelled) {
          setSubscriptionTier(displayTierName(data.subscription_tier));
          setVerification({ key: verificationKey, state: 'success' });
        }

        // The checkout-session response is the verification authority. Local
        // cache refreshes are best-effort and must not leave a confirmed payment
        // stuck on the verifying screen if one of them is slow or unavailable.
        void Promise.allSettled([
          Promise.resolve().then(() => !cancelled && refreshCallbacks.current.userId === userId && refreshCallbacks.current.refetchProfile()),
          Promise.resolve().then(() => !cancelled && refreshCallbacks.current.userId === userId && refreshCallbacks.current.invalidateCache('paid_subscriber')),
        ]);
      } catch {
        if (!cancelled) {
          setVerification({ key: verificationKey, state: 'error' });
        }
      }
    };

    void verifySubscription();
    return () => {
      cancelled = true;
    };
  }, [authLoading, userId, location.search, verificationKey]);

  useEffect(() => {
    if (verificationState !== 'success') return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((current) => current - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    navigate('/dashboard?from=payment-success');
  }, [countdown, navigate, verificationState]);

  const handleGoToDashboard = () => {
    navigate('/dashboard?from=payment-success');
  };

  const handleRetry = () => {
    setVerificationAttempt((attempt) => attempt + 1);
  };

  const isVerifying = verificationState === 'verifying';
  const isSuccess = verificationState === 'success';
  const isError = verificationState === 'error';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0f1a] flex items-center justify-center p-4 text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-70"
        style={{
          background:
            'radial-gradient(60% 80% at 50% 0%, hsl(142 69% 45% / 0.18), transparent 70%)',
        }}
      />
      <Card
        className="relative w-full max-w-md rounded-2xl border-white/10 bg-white/[0.025] text-center shadow-2xl shadow-black/40 backdrop-blur"
        role={isVerifying ? 'status' : isError ? 'alert' : undefined}
        aria-live={isVerifying ? 'polite' : isError ? 'assertive' : undefined}
      >
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4">
            {isVerifying ? (
              <Loader2 aria-hidden="true" className="h-16 w-16 text-primary animate-spin" />
            ) : isSuccess ? (
              <CheckCircle2 aria-hidden="true" className="h-16 w-16 text-green-500" />
            ) : (
              <XCircle aria-hidden="true" className="h-16 w-16 text-destructive" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isVerifying
              ? t('payment.subscription.verifyingTitle', 'Verifying Subscription...')
              : isSuccess
                ? t('payment.subscription.successTitle', 'Payment Successful!')
                : t('payment.subscription.errorTitle', 'Payment Could Not Be Verified')}
          </CardTitle>
          <CardDescription>
            {isVerifying ? (
              t('payment.subscription.checkingStatus', 'We are checking your subscription status...')
            ) : isSuccess && subscriptionTier ? (
              t('payment.subscription.descActivatedTier', 'Your {{tier}} subscription has been successfully activated.', { tier: subscriptionTier })
            ) : isSuccess ? (
              t('payment.subscription.descActivated', 'Your subscription has been successfully activated.')
            ) : (
              t('payment.subscription.errorDescription', 'We could not verify this payment. No subscription activation has been confirmed.')
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isSuccess && (
            <>
              {subscriptionTier && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">{t('payment.subscription.accessTo', 'You now have access to:')}</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {subscriptionTier === 'Starter' && (
                    <>
                      <li>• {t('payment.subscription.features.starter.f1', 'Unlimited WhatsApp contact management')}</li>
                      <li>• {t('payment.subscription.features.starter.f2', 'Dual-calendar orchestration system')}</li>
                      <li>• {t('payment.subscription.features.starter.f3', 'AI-powered intelligent reminder sequences')}</li>
                      <li>• {t('payment.subscription.features.starter.f4', 'Essential dashboard overview & live operations monitoring')}</li>
                      <li>• {t('payment.subscription.features.starter.f5', 'Global multi-language localization')}</li>
                      <li>• {t('payment.subscription.features.starter.f6', 'Streamlined payment processing & collection')}</li>
                    </>
                  )}
                  {subscriptionTier === 'Professional' && (
                    <>
                      <li>• {t('payment.subscription.features.professional.f1', 'All Starter premium features included')}</li>
                      <li>• {t('payment.subscription.features.professional.f2', 'Automated tax compliance & administration (Coming Soon)')}</li>
                      <li>• {t('payment.subscription.features.professional.f3', 'Unlimited calendar orchestration platform')}</li>
                      <li>• {t('payment.subscription.features.professional.f4', 'Advanced team collaboration suite (3+ users)')}</li>
                      <li>• {t('payment.subscription.features.professional.f5', 'Multi-location business coordination')}</li>
                      <li>• {t('payment.subscription.features.professional.f6', 'Complete analytics suite: Business Intelligence, Performance tracking & Future Insights')}</li>
                      <li>• {t('payment.subscription.features.professional.f7', 'Dedicated priority customer success')}</li>
                    </>
                  )}
                  {subscriptionTier === 'Enterprise' && (
                    enterpriseClaims.map((claim) => (
                      <li key={claim.id}>• {claim.text}</li>
                    ))
                  )}
                </ul>
              </div>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleGoToDashboard}
                  className="w-full"
                >
                  {t('payment.subscription.goToDashboard', 'Go to Dashboard')}
                </Button>

                <p className="text-sm text-muted-foreground">
                  {countdown === 1
                    ? t('payment.subscription.redirectInOne', 'Automatic redirect in {{count}} second...', { count: countdown })
                    : t('payment.subscription.redirectInOther', 'Automatic redirect in {{count}} seconds...', { count: countdown })}
                </p>
              </div>
            </>
          )}
          {isError && (
            <div className="flex flex-col gap-3">
              <Button type="button" onClick={handleRetry} className="w-full">
                {t('payment.subscription.retryVerification', 'Try again')}
              </Button>
              <Button type="button" onClick={handleGoToDashboard} variant="outline" className="w-full">
                {t('payment.subscription.goToDashboard', 'Go to Dashboard')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
