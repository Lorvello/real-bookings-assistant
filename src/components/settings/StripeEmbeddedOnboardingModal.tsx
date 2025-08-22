import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { supabase } from '@/integrations/supabase/client';
import { getStripeMode } from '@/utils/stripeConfig';

interface StripeEmbeddedOnboardingModalProps {
  calendarId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const StripeEmbeddedOnboardingModal: React.FC<StripeEmbeddedOnboardingModalProps> = ({
  calendarId,
  isOpen,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<'intro' | 'loading' | 'embedded' | 'complete' | 'error'>('intro');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectedAccountId, setConnectedAccountId] = useState<string | null>(null);
  const { toast } = useToast();
  const { refreshAccountStatus } = useStripeConnect();

  const testMode = getStripeMode() === 'test';

  const handleStartOnboarding = async () => {
    setStep('loading');
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-embedded', {
        body: { 
          calendar_id: calendarId,
          test_mode: testMode
        }
      });

      if (error) throw error;

      if (data.success && data.client_secret) {
        setClientSecret(data.client_secret);
        setConnectedAccountId(data.account_id);
        setStep('embedded');
      } else {
        throw new Error(data.error || 'Failed to create embedded onboarding session');
      }
    } catch (err) {
      console.error('Embedded onboarding error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start onboarding');
      setStep('error');
      toast({
        title: "Error",
        description: "Failed to start Stripe onboarding. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleComplete = async () => {
    setStep('loading');
    
    try {
      // Refresh account status to get latest data
      const account = await refreshAccountStatus(calendarId);
      if (account && account.onboarding_completed) {
        setStep('complete');
        setTimeout(() => {
          onComplete();
          onClose();
        }, 2000);
      } else {
        setError('Onboarding appears incomplete. Please try again.');
        setStep('error');
      }
    } catch (err) {
      console.error('Error checking completion:', err);
      setError('Failed to verify completion. Please refresh the page.');
      setStep('error');
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('intro');
      setError(null);
      setClientSecret(null);
      setConnectedAccountId(null);
    }
  }, [isOpen]);

  // Load Stripe Connect JS when needed
  useEffect(() => {
    if (step === 'embedded' && clientSecret) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => {
        initializeStripeEmbedded();
      };
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [step, clientSecret]);

  const initializeStripeEmbedded = () => {
    if (!clientSecret) return;

    // @ts-ignore - Stripe is loaded dynamically
    const stripe = Stripe(testMode ? 
      'pk_test_51QCw3HLcBboIITXgmtorLbhQYKnYWGhGW6L4HyIWmjhfGcnhFQCxN5qKBJBgM7pMBbvE4cZqkh4O3jE49Cn6zPKN00ULNlAojE' :
      'pk_live_your_publishable_key'
    );

    const connectedAccountOnboarding = stripe.connectAccountOnboarding({
      clientSecret: clientSecret,
    });

    const container = document.getElementById('stripe-embedded-onboarding');
    if (container) {
      connectedAccountOnboarding.mount(container);
    }

    // Handle completion
    connectedAccountOnboarding.on('complete', () => {
      console.log('Stripe onboarding completed');
      handleComplete();
    });
  };

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

        {step === 'intro' && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You'll need to provide some business information to accept payments through Stripe.
                This is required for security and compliance reasons.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium">What you'll need:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Business or personal information</li>
                <li>• Bank account details for payouts</li>
                <li>• Government-issued ID verification</li>
                <li>• Business details (if applicable)</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleStartOnboarding}>
                Start Setup
              </Button>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm text-muted-foreground">
              {clientSecret ? 'Completing setup...' : 'Setting up your Stripe account...'}
            </p>
          </div>
        )}

        {step === 'embedded' && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Complete the form below to finish setting up your Stripe account for payments.
              </AlertDescription>
            </Alert>
            
            <div 
              id="stripe-embedded-onboarding" 
              className="min-h-[400px] border border-border rounded-lg"
            />
          </div>
        )}

        {step === 'complete' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div className="text-center space-y-2">
              <h3 className="font-medium">Setup Complete!</h3>
              <p className="text-sm text-muted-foreground">
                Your Stripe account has been successfully connected.
              </p>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'An error occurred during setup'}
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={handleStartOnboarding}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};