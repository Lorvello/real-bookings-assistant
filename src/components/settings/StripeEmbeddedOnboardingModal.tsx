import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { supabase } from '@/integrations/supabase/client';
import { getStripeMode, getStripePublishableKey } from '@/utils/stripeConfig';

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
  const { toast } = useToast();
  const { refreshAccountStatus } = useStripeConnect();

  const testMode = getStripeMode() === 'test';

  const handleStartOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[STRIPE ONBOARDING] Starting onboarding...');
      
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { 
          test_mode: testMode
        }
      });

      if (error) {
        console.error('[STRIPE ONBOARDING] Function error:', error);
        throw error;
      }

      console.log('[STRIPE ONBOARDING] Function response:', data);

      if (data.url) {
        console.log('[STRIPE ONBOARDING] Opening Stripe onboarding in new tab');
        // Small delay to ensure state is updated before opening
        setTimeout(() => {
          window.open(data.url, '_blank');
          onClose();
          
          // Set up periodic status checking while user is onboarding
          const checkInterval = setInterval(async () => {
            try {
              const account = await refreshAccountStatus();
              if (account && account.onboarding_completed) {
                clearInterval(checkInterval);
                onComplete();
              }
            } catch (error) {
              console.log('[STRIPE ONBOARDING] Status check error:', error);
            }
          }, 10000); // Check every 10 seconds

          // Stop checking after 10 minutes
          setTimeout(() => clearInterval(checkInterval), 600000);
        }, 100);
      } else {
        throw new Error('No onboarding URL received from Stripe');
      }
    } catch (err) {
      console.error('[STRIPE ONBOARDING] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start onboarding');
      toast({
        title: "Error",
        description: "Failed to open Stripe onboarding. Please try again.",
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

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setLoading(false);
      setError(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

        {!error && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You'll need to provide some business information to accept payments through Stripe.
                This will open Stripe's secure onboarding page in a new tab.
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
                    Opening Stripe...
                  </>
                ) : (
                  'Start Stripe Setup'
                )}
              </Button>
            </div>
          </div>
        )}

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