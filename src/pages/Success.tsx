import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserStatus } from '@/contexts/UserStatusContext';

export default function Success() {
  const navigate = useNavigate();
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
      const maxRetries = 5;
      let retryCount = 0;
      
      const attemptVerification = async (): Promise<void> => {
        try {
          console.log(`Starting subscription verification attempt ${retryCount + 1}...`);
          
          // Add progressive delay for retries
          if (retryCount > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000 + (retryCount * 1000)));
          }
          
          // Progressive session recovery strategy
          let session = null;
          let user = null;
          
          // Step 1: Try to get current session
          console.log('Step 1: Checking current session...');
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          if (!sessionError && sessionData.session) {
            session = sessionData.session;
            user = sessionData.session.user;
            console.log('Current session valid:', { userId: user.id, email: user.email });
          } else {
            console.log('Current session invalid, attempting refresh...');
            
            // Step 2: Try to refresh session
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (!refreshError && refreshData.session) {
              session = refreshData.session;
              user = refreshData.session.user;
              console.log('Session refreshed successfully:', { userId: user.id, email: user.email });
            } else {
              console.error('Session refresh failed:', refreshError);
              
              // Step 3: Try to get user directly (in case of token issues)
              const { data: userData, error: userError } = await supabase.auth.getUser();
              
              if (!userError && userData.user) {
                user = userData.user;
                console.log('User found directly:', { userId: user.id, email: user.email });
              } else {
                console.error('All session recovery attempts failed');
                
                if (retryCount < maxRetries - 1) {
                  retryCount++;
                  console.log(`Session recovery failed, retrying in ${retryCount} seconds...`);
                  await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
                  return attemptVerification();
                }
                
                // Last resort: Show verification status and navigate to dashboard
                if (!toastShownRef.current) {
                  toastShownRef.current = true;
                  toast({
                    title: "Verification Successful",
                    description: "Your payment has been processed. Please log in again to see your new subscription.",
                    variant: "default",
                  });
                }
                setIsVerifying(false);
                setTimeout(() => navigate('/dashboard'), 2000);
                return;
              }
            }
          }
          
          console.log('Valid session/user found, verifying subscription...');
          console.log('Current session token:', session?.access_token ? 'Present' : 'Missing');
          
          // Test the check-subscription function call with detailed debugging
          console.log('Calling check-subscription function...');
          const startTime = Date.now();
          
          const { data, error } = await supabase.functions.invoke('check-subscription', {
            headers: {
              Authorization: `Bearer ${session?.access_token || 'no-token'}`,
            }
          });
          
          const endTime = Date.now();
          console.log(`Function call completed in ${endTime - startTime}ms`);
          console.log('Raw function response:', { data, error });
          
          if (error) {
            console.error('Function returned error:', {
              message: error.message,
              details: error.details,
              code: error.code,
              status: error.status
            });
            
            // Check if it's an authentication issue
            if (error.message?.includes('JWT') || error.message?.includes('auth') || error.status === 401) {
              console.log('Authentication issue detected, trying to get fresh token...');
              
              // Try to get a fresh session
              const { data: freshSession } = await supabase.auth.getSession();
              if (freshSession.session) {
                console.log('Retrying with fresh session...');
                const { data: retryData, error: retryError } = await supabase.functions.invoke('check-subscription', {
                  headers: {
                    Authorization: `Bearer ${freshSession.session.access_token}`,
                  }
                });
                
                if (!retryError && retryData) {
                  console.log('Retry successful:', retryData);
                  // Process successful retry data
                  const tierName = retryData?.subscription_tier;
                  let displayTier = 'Professional';
                  if (tierName === 'starter') {
                    displayTier = 'Starter';
                  } else if (tierName === 'professional') {
                    displayTier = 'Professional';
                  } else if (tierName === 'enterprise') {
                    displayTier = 'Enterprise';
                  }
                  
                  setSubscriptionTier(displayTier);
                  await invalidateCache('paid_subscriber');
                  
                  if (!toastShownRef.current) {
                    toastShownRef.current = true;
                    toast({
                      title: "Payment Successful!",
                      description: `Your ${displayTier} subscription has been activated.`,
                    });
                  }
                  return; // Exit successfully
                } else {
                  console.error('Retry also failed:', retryError);
                }
              }
            }
            
            if (retryCount < maxRetries - 1) {
              retryCount++;
              console.log(`Subscription verification failed, retrying in ${retryCount} seconds...`);
              await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
              return attemptVerification();
            }
            
            // Final fallback - show success but recommend refresh
            if (!toastShownRef.current) {
              toastShownRef.current = true;
              toast({
                title: "Payment Successful", 
                description: "Your payment has been processed. Refresh the page to see your new subscription.",
                variant: "default",
              });
            }
            setTimeout(() => navigate('/dashboard'), 2000);
          } else {
            console.log('Subscription verified successfully:', data);
            
            // Verify we have the required data
            if (!data?.subscribed || !data?.subscription_tier) {
              if (retryCount < maxRetries - 1) {
                retryCount++;
                console.log(`Incomplete subscription data, retrying in ${retryCount} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
                return attemptVerification();
              }
            }
            
            const tierName = data?.subscription_tier;
            
            // Properly capitalize tier names for display
            let displayTier = 'Professional';
            if (tierName === 'starter') {
              displayTier = 'Starter';
            } else if (tierName === 'professional') {
              displayTier = 'Professional';
            } else if (tierName === 'enterprise') {
              displayTier = 'Enterprise';
            }
            
            setSubscriptionTier(displayTier);
            
            // Force cache invalidation with paid_subscriber status
            console.log('Forcing user status cache update to paid_subscriber...');
            await invalidateCache('paid_subscriber');
            
            // Show success toast only once
            if (!toastShownRef.current) {
              toastShownRef.current = true;
              toast({
                title: "Payment Successful!",
                description: `Your ${displayTier} subscription has been activated.`,
              });
            }
          }
        } catch (error) {
          console.error(`Verification attempt ${retryCount + 1} failed:`, error);
          
          if (retryCount < maxRetries - 1) {
            retryCount++;
            console.log(`Retrying verification in ${retryCount + 1} seconds...`);
            await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
            return attemptVerification();
          }
          
          console.error('All verification attempts failed');
          if (!toastShownRef.current) {
            toastShownRef.current = true;
            toast({
              title: "Payment Processed",
              description: "Your payment was successful. Go to your dashboard to see your new subscription.",
              variant: "default",
            });
          }
          // Navigate to dashboard 
          setTimeout(() => navigate('/dashboard'), 2000);
        }
      };
      
      try {
        await attemptVerification();
      } catch (error) {
        console.error('Final verification error:', error);
      } finally {
        setIsVerifying(false);
      }
    };

    verifySubscription();
  }, [toast, invalidateCache, navigate]);

  useEffect(() => {
    if (!isVerifying && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      navigate('/dashboard');
    }
  }, [countdown, isVerifying, navigate]);

  const handleGoToDashboard = () => {
    navigate('/dashboard');
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
                      <li>• Up to 2 calendars</li>
                      <li>• Basic calendar management</li>
                      <li>• Email notifications</li>
                      <li>• Customer booking portal</li>
                    </>
                  )}
                  {subscriptionTier === 'Professional' && (
                    <>
                      <li>• Unlimited calendars</li>
                      <li>• Advanced analytics</li>
                      <li>• Team collaboration</li>
                      <li>• API access</li>
                      <li>• Custom branding</li>
                    </>
                  )}
                  {subscriptionTier === 'Enterprise' && (
                    <>
                      <li>• All Professional features</li>
                      <li>• White-label solution</li>
                      <li>• Advanced integrations</li>
                      <li>• Dedicated support</li>
                      <li>• Custom features</li>
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