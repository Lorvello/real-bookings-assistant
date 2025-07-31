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
      try {
        console.log('Starting subscription verification after Stripe redirect...');
        
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
              
              // Last resort: Show verification status and navigate to dashboard
              if (!toastShownRef.current) {
                toastShownRef.current = true;
                toast({
                  title: "Verificatie gelukt",
                  description: "Je betaling is verwerkt. Log opnieuw in om je nieuwe abonnement te zien.",
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
        
        // Now call check-subscription with valid session
        const { data, error } = await supabase.functions.invoke('check-subscription');
        
        if (error) {
          console.error('Error verifying subscription:', error);
          if (!toastShownRef.current) {
            toastShownRef.current = true;
            toast({
              title: "Betaling gelukt", 
              description: "Je betaling is verwerkt. Refresh de pagina om je nieuwe abonnement te zien.",
              variant: "default",
            });
          }
          // Still navigate to dashboard 
          setTimeout(() => navigate('/dashboard'), 2000);
        } else {
          console.log('Subscription verified successfully:', data);
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
          
          // Update cache without forcing reload
          invalidateCache('paid_subscriber');
          
          // Show success toast only once
          if (!toastShownRef.current) {
            toastShownRef.current = true;
            toast({
              title: "Betaling succesvol!",
              description: `Je ${displayTier} abonnement is geactiveerd.`,
            });
          }
        }
      } catch (error) {
        console.error('Error in subscription verification:', error);
        if (!toastShownRef.current) {
          toastShownRef.current = true;
          toast({
            title: "Betaling verwerkt",
            description: "Je betaling is gelukt. Ga naar je dashboard om je nieuwe abonnement te zien.",
            variant: "default",
          });
        }
        // Navigate to dashboard 
        setTimeout(() => navigate('/dashboard'), 2000);
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
            {isVerifying ? 'Abonnement verifiëren...' : 'Betaling succesvol!'}
          </CardTitle>
          <CardDescription>
            {isVerifying ? (
              'We controleren je abonnementsstatus...'
            ) : (
              `Je ${subscriptionTier} abonnement is succesvol geactiveerd.`
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!isVerifying && (
            <>
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Je hebt nu toegang tot:</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {subscriptionTier === 'Starter' && (
                    <>
                      <li>• Tot 2 kalenders</li>
                      <li>• Basis kalenderbeheer</li>
                      <li>• E-mail notificaties</li>
                      <li>• Klant boekingsportaal</li>
                    </>
                  )}
                  {subscriptionTier === 'Professional' && (
                    <>
                      <li>• Onbeperkte kalenders</li>
                      <li>• Geavanceerde analytics</li>
                      <li>• Team samenwerking</li>
                      <li>• API toegang</li>
                      <li>• Custom branding</li>
                    </>
                  )}
                  {subscriptionTier === 'Enterprise' && (
                    <>
                      <li>• Alle Professional features</li>
                      <li>• White-label oplossing</li>
                      <li>• Geavanceerde integraties</li>
                      <li>• Toegewijde support</li>
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
                  Naar Dashboard
                </Button>
                
                <p className="text-sm text-muted-foreground">
                  Automatische doorverwijzing in {countdown} seconden...
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}