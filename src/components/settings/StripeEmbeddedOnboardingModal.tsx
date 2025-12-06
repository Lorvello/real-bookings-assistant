import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { getStripeMode, getStripePublishableKey } from '@/utils/stripeConfig';
import { loadConnectAndInitialize } from '@stripe/connect-js';

interface StripeEmbeddedOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const StripeEmbeddedOnboardingModal: React.FC<StripeEmbeddedOnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmbedded, setShowEmbedded] = useState(false);
  const [connectInstance, setConnectInstance] = useState<any>(null);
  const { toast } = useToast();
  const { refreshAccountStatus, createEmbeddedSession } = useStripeConnect();
  const { invalidateCache } = useUserStatus();
  const { refetch: refetchProfile } = useProfile();

  const testMode = getStripeMode() === 'test';

  const handleStartOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[STRIPE EMBEDDED] Starting embedded onboarding...');
      
      // Try embedded session first
      const session = await createEmbeddedSession();
      if (!session) {
        throw new Error('Failed to create embedded session');
      }

      console.log('[STRIPE EMBEDDED] Session created, loading Connect JS...');
      
      try {
        // Initialize Stripe Connect
        const stripeConnectInstance = await loadConnectAndInitialize({
          publishableKey: getStripePublishableKey(),
          fetchClientSecret: async () => session.client_secret,
        });
        
        setConnectInstance(stripeConnectInstance);
        setShowEmbedded(true);
        console.log('[STRIPE EMBEDDED] Embedded form initialized');
        
      } catch (embedError) {
        console.warn('[STRIPE EMBEDDED] Failed to load embedded form, falling back to redirect:', embedError);
        
        // Fallback to regular onboarding
        const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
          body: { test_mode: testMode }
        });

        if (error) throw error;
        
        if (data.url) {
          window.open(data.url, '_blank');
          onClose();
          
          // Set up status checking
          const checkInterval = setInterval(async () => {
            try {
              const account = await refreshAccountStatus();
              if (account?.onboarding_completed) {
                clearInterval(checkInterval);
                onComplete();
              }
            } catch (error) {
              console.log('[STRIPE ONBOARDING] Status check error:', error);
            }
          }, 10000);

          setTimeout(() => clearInterval(checkInterval), 600000);
        }
      }
    } catch (err) {
      console.error('[STRIPE EMBEDDED] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start onboarding');
      toast({
        title: "Error",
        description: "Failed to start Stripe setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetryOnboarding = () => {
    setError(null);
    handleStartOnboarding();
  };

  const handleCheckCompletion = async () => {
    try {
      console.log('[STRIPE ONBOARDING] Checking completion status');
    const account = await refreshAccountStatus();
      if (account && account.onboarding_completed) {
        console.log('[STRIPE ONBOARDING] Account setup completed successfully');
        onComplete();
        onClose();
      } else {
        console.log('[STRIPE ONBOARDING] Account setup not yet completed');
        toast({
          title: "Setup In Progress",
          description: "Please complete the Stripe onboarding process to enable payments.",
        });
      }
    } catch (err) {
      console.error('[STRIPE ONBOARDING] Error checking completion:', err);
      toast({
        title: "Error",
        description: "Failed to check completion status. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  // Handle embedded completion
  const handleEmbeddedComplete = async () => {
    console.log('[STRIPE EMBEDDED] Onboarding completed, refreshing all data...');
    
    try {
      // Step 1: Refresh Stripe account status
      const refreshedAccount = await refreshAccountStatus();
      console.log('[STRIPE EMBEDDED] Account status refreshed:', {
        onboarding_completed: refreshedAccount?.onboarding_completed,
        charges_enabled: refreshedAccount?.charges_enabled,
        payouts_enabled: refreshedAccount?.payouts_enabled
      });
      
      // Step 2: Clear session storage cache
      sessionStorage.clear();
      
      // Step 3: Refresh profile data
      await refetchProfile();
      
      // Step 4: Invalidate user status cache
      await invalidateCache();
      
      // Step 5: Automatically sync existing services with Stripe
      console.log('[STRIPE EMBEDDED] Auto-syncing services with Stripe...');
      const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-services-with-stripe', {
        body: { test_mode: testMode }
      });
      
      if (syncError) {
        console.error('[STRIPE EMBEDDED] Service sync error:', syncError);
      } else {
        console.log('[STRIPE EMBEDDED] Services synced:', syncData);
        const syncedCount = syncData?.results?.filter((r: any) => r.success)?.length || 0;
        if (syncedCount > 0) {
          toast({
            title: "Services Connected",
            description: `${syncedCount} service(s) are now ready to accept payments.`,
          });
        }
      }
      
    } catch (error) {
      console.error('[STRIPE EMBEDDED] Error refreshing status after completion:', error);
    }
    
    setShowEmbedded(false);
    onComplete();
    onClose();
    
    // Force page reload to ensure clean state
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setError(null);
      setShowEmbedded(false);
      setConnectInstance(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={showEmbedded ? "max-w-4xl max-h-[90vh] overflow-hidden" : "max-w-2xl max-h-[90vh] overflow-y-auto"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {testMode && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                TEST MODE
              </span>
            )}
            Stripe Account Setup
          </DialogTitle>
        </DialogHeader>

        {showEmbedded && connectInstance ? (
          <div className="w-full h-[600px] border rounded-lg overflow-hidden">
            {/* Embedded Stripe Connect form will be rendered here */}
            <div id="stripe-connect-onboarding" className="w-full h-full" />
          </div>
        ) : !error ? (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You'll need to provide some business information to accept payments through Stripe.
                We'll try to show an embedded form, with a fallback to a new tab if needed.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium">What you'll need:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Business or personal information</li>
                <li>• Bank account details for payouts</li>
                <li>• Government-issued ID verification</li>
                <li>• Phone number for verification</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleStartOnboarding} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Setting up...
                  </>
                ) : (
                  'Start Stripe Setup'
                )}
              </Button>
            </div>
          </div>
        ) : null}

        {error && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
              <Button onClick={handleRetryOnboarding} className="flex-1">
                Try Again
              </Button>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <Button variant="ghost" onClick={handleCheckCompletion} className="w-full text-sm">
            I've completed setup in Stripe - Check Status
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};