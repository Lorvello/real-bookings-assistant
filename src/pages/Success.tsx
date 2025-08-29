import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserStatus } from '@/contexts/UserStatusContext';

export default function Success() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { invalidateCache } = useUserStatus();
  const [isVerifying, setIsVerifying] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const toastShownRef = useRef(false);
  const verificationAttemptedRef = useRef(false);

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
        
        // Call the new check-subscription-by-session function
        const { data, error } = await supabase.functions.invoke('check-subscription-by-session', {
          body: { session_id: sessionId }
        });
        
        console.log('Function response:', { data, error });
        
        if (error) {
          throw error;
        }
        
        if (!data.success) {
          throw new Error(data.error || 'Subscription verification failed');
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
        
        console.log('Setting subscription tier:', displayTier);
        setSubscriptionTier(displayTier);
        setIsVerifying(false);
        
        // Restore auth session if provided
        if (data.auth_session) {
          try {
            console.log('Restoring auth session...');
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: data.auth_session.access_token,
              refresh_token: data.auth_session.refresh_token
            });
            
            if (!sessionError && sessionData.session) {
              console.log('Auth session restored successfully');
            } else {
              console.warn('Could not restore auth session:', sessionError);
            }
          } catch (sessionError) {
            console.warn('Error restoring session:', sessionError);
          }
        }
        
        // Invalidate any cached user status
        await invalidateCache('paid_subscriber');
        
        // Show success toast
        if (!toastShownRef.current) {
          toastShownRef.current = true;
          toast({
            title: "Payment Successful!",
            description: `Your ${displayTier} subscription has been activated.`,
          });
        }
        
        
      } catch (error) {
        console.error('Error during verification:', error);
        setIsVerifying(false);
        
        if (!toastShownRef.current) {
          toastShownRef.current = true;
          toast({
            title: "Verification Issue",
            description: "Your payment was successful! Please check your dashboard or contact support if needed.",
            variant: "default",
          });
        }
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    };

    verifySubscription();
  }, [toast, invalidateCache, navigate, location.search]);

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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4">
            {isVerifying ? (
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            ) : (
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isVerifying ? 'Verifying Subscription...' : 'Payment Successful!'}
          </CardTitle>
          <CardDescription>
            {isVerifying ? (
              'We are checking your subscription status...'
            ) : (
              `Your ${subscriptionTier} subscription has been successfully activated.`
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!isVerifying && (
            <>
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">You now have access to:</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {subscriptionTier === 'Starter' && (
                    <>
                      <li>• Unlimited WhatsApp contact management</li>
                      <li>• Dual-calendar orchestration system</li>
                      <li>• AI-powered intelligent reminder sequences</li>
                      <li>• Essential dashboard overview & live operations monitoring</li>
                      <li>• Global multi-language localization</li>
                      <li>• Streamlined payment processing & collection</li>
                    </>
                  )}
                  {subscriptionTier === 'Professional' && (
                    <>
                      <li>• All Starter premium features included</li>
                      <li>• Unlimited calendar orchestration platform</li>
                      <li>• Advanced team collaboration suite (3+ users)</li>
                      <li>• Multi-location business coordination</li>
                      <li>• Complete analytics suite: Business Intelligence, Performance tracking & Future Insights</li>
                      <li>• Dedicated priority customer success</li>
                    </>
                  )}
                  {subscriptionTier === 'Enterprise' && (
                    <>
                      <li>• Complete professional suite included</li>
                      
                      <li>• Dedicated WhatsApp Business API with custom branding</li>
                      <li>• Intelligent voice call routing & distribution</li>
                      <li>• Omnichannel social media DM orchestration</li>
                      <li>• Advanced reputation management & review analytics</li>
                      <li>• Enterprise SLA with dedicated success management</li>
                      <li>• White-glove onboarding & strategic integration consulting</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleGoToDashboard}
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
                
                <p className="text-sm text-muted-foreground">
                  Automatic redirect in {countdown} seconds...
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}