import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useProfile } from '@/hooks/useProfile';

export default function Success() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(['payment', 'app']);
  const { toast } = useToast();
  const { invalidateCache } = useUserStatus();
  const { refetch: refetchProfile } = useProfile();
  const [isVerifying, setIsVerifying] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const toastShownRef = useRef(false);
  const verificationAttemptedRef = useRef(false);

  // F-036: /success wraps no DashboardLayout, so the F-035 title effect never runs
  // here and the page previously set no document.title, leaving the browser tab on
  // whatever the prior page left (or the index.html default). Mirror the F-035
  // app-peer pattern: an i18n page title + the shared `app.documentTitleSuffix`
  // brand suffix, following the EN<->NL toggle (`t` identity flips on changeLanguage).
  useEffect(() => {
    const suffix = t('app.documentTitleSuffix', { ns: 'app', defaultValue: 'Bookings Assistant' });
    document.title = `${t('payment.subscription.documentTitle', 'Payment Successful')} | ${suffix}`;
  }, [t]);

  useEffect(() => {
    // Prevent multiple verification attempts
    if (verificationAttemptedRef.current) return;
    verificationAttemptedRef.current = true;

    const verifySubscription = async () => {
      try {
        console.log('Starting subscription verification with Stripe session...');
        
        // Extract session_id from URL parameters
        const urlParams = new URLSearchParams(location.search);
        const sessionId = urlParams.get('session_id');
        
        if (!sessionId) {
          throw new Error('No session_id found in URL');
        }
        
        console.log('Found session ID:', sessionId);
        
        // Call the standard check-subscription function to refresh database status
        console.log('Step 1: Calling check-subscription to update database...');
        const { data, error } = await supabase.functions.invoke('check-subscription', {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });
        
        console.log('Check-subscription response:', { data, error });
        
        if (error) {
          throw new Error(`Subscription verification failed: ${error.message || error}`);
        }
        
        if (!data.subscribed) {
          throw new Error('Subscription not found or inactive after payment');
        }
        
        // Extract tier name and convert to display format
        const tierName = data.subscription_tier;
        let displayTier = 'Professional'; // Default fallback
        
        if (tierName === 'starter') {
          displayTier = 'Starter';
        } else if (tierName === 'professional') {
          displayTier = 'Professional';
        } else if (tierName === 'enterprise') {
          displayTier = 'Enterprise';
        }
        
        console.log('Database updated successfully. Tier:', displayTier);
        setSubscriptionTier(displayTier);
        
        // Step 2: Force refresh profile data to ensure it's in sync with database
        console.log('Step 2: Refreshing profile data...');
        await refetchProfile();
        
        // Step 3: Wait a moment for changes to propagate
        console.log('Step 3: Waiting for changes to propagate...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 4: Directly fetch the definitive user status from database
        console.log('Step 4: Fetching definitive user status from database...');
        const { data: userStatusData, error: statusError } = await supabase
          .rpc('get_user_status_type', { 
            p_user_id: (await supabase.auth.getUser()).data.user?.id 
          });
        
        if (statusError) {
          console.error('Error fetching user status:', statusError);
        } else {
          console.log('Database user status:', userStatusData);
          
          // Step 5: Force update the user status context with the definitive status
          console.log('Step 5: Updating user status context to:', userStatusData);
          await invalidateCache(userStatusData || 'paid_subscriber');
        }
        
        setIsVerifying(false);
        
        // Show success toast
        if (!toastShownRef.current) {
          toastShownRef.current = true;
          toast({
            title: t('payment.subscription.successTitle', 'Payment Successful!'),
            description: t('payment.subscription.toastActivatedDesc', 'Your {{tier}} subscription has been activated.', { tier: displayTier }),
          });
        }
        
        console.log('Subscription verification completed successfully!');
        
        
      } catch (error) {
        console.error('Error during verification:', error);
        setIsVerifying(false);
        
        if (!toastShownRef.current) {
          toastShownRef.current = true;
          toast({
            title: t('payment.subscription.toastIssueTitle', 'Verification Issue'),
            description: t('payment.subscription.toastIssueDesc', 'Your payment was successful! Please check your dashboard or contact support if needed.'),
            variant: "default",
          });
        }
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    };

    verifySubscription();
  }, [toast, invalidateCache, navigate, location.search, t]);

  useEffect(() => {
    if (!isVerifying && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
        navigate('/dashboard?from=payment-success');
    }
  }, [countdown, isVerifying, navigate]);

  const handleGoToDashboard = () => {
    navigate('/dashboard?from=payment-success');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0f1a] flex items-center justify-center p-4 text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-70"
        style={{
          background:
            'radial-gradient(60% 80% at 50% 0%, hsl(142 69% 45% / 0.18), transparent 70%)',
        }}
      />
      <Card className="relative w-full max-w-md rounded-2xl border-white/10 bg-white/[0.025] text-center shadow-2xl shadow-black/40 backdrop-blur">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4">
            {isVerifying ? (
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            ) : (
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isVerifying
              ? t('payment.subscription.verifyingTitle', 'Verifying Subscription...')
              : t('payment.subscription.successTitle', 'Payment Successful!')}
          </CardTitle>
          <CardDescription>
            {isVerifying ? (
              t('payment.subscription.checkingStatus', 'We are checking your subscription status...')
            ) : subscriptionTier ? (
              t('payment.subscription.descActivatedTier', 'Your {{tier}} subscription has been successfully activated.', { tier: subscriptionTier })
            ) : (
              t('payment.subscription.descActivated', 'Your subscription has been successfully activated.')
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!isVerifying && (
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
                    <>
                      <li>• {t('payment.subscription.features.enterprise.f1', 'Complete professional suite included')}</li>

                      <li>• {t('payment.subscription.features.enterprise.f2', 'Dedicated WhatsApp Business API with custom branding')}</li>
                      <li>• {t('payment.subscription.features.enterprise.f3', 'Intelligent voice call routing & distribution')}</li>
                      <li>• {t('payment.subscription.features.enterprise.f4', 'Omnichannel social media DM orchestration')}</li>
                      <li>• {t('payment.subscription.features.enterprise.f5', 'Advanced reputation management & review analytics')}</li>
                      <li>• {t('payment.subscription.features.enterprise.f6', 'Enterprise SLA with dedicated success management')}</li>
                      <li>• {t('payment.subscription.features.enterprise.f7', 'White-glove onboarding & strategic integration consulting')}</li>
                    </>
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
        </CardContent>
      </Card>
    </div>
  );
}