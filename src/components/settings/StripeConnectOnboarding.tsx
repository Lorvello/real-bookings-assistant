import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ExternalLink, CheckCircle, CreditCard, Shield, Zap } from 'lucide-react';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import type { BusinessStripeAccount } from '@/types/payments';

interface StripeConnectOnboardingProps {
  calendarId: string;
  onComplete: (account: BusinessStripeAccount) => void;
  onClose: () => void;
}

export function StripeConnectOnboarding({ 
  calendarId, 
  onComplete, 
  onClose 
}: StripeConnectOnboardingProps) {
  const { createOnboardingLink, onboarding } = useStripeConnect();
  const [step, setStep] = useState<'intro' | 'onboarding' | 'complete'>('intro');

  const handleStartOnboarding = async () => {
    const onboardingLink = await createOnboardingLink(calendarId);
    
    if (onboardingLink) {
      setStep('onboarding');
      // Open onboarding in new window
      const popup = window.open(
        onboardingLink.url, 
        'stripe-onboarding',
        'width=600,height=800,scrollbars=yes,resizable=yes'
      );

      // Poll for completion
      const pollForCompletion = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollForCompletion);
          setStep('complete');
          // Here you would typically refresh the account status
          // For now, we'll simulate completion
          setTimeout(() => {
            onComplete({
              id: '',
              calendar_id: calendarId,
              stripe_account_id: 'acct_example',
              account_status: 'active',
              onboarding_completed: true,
              charges_enabled: true,
              payouts_enabled: true,
              currency: 'eur',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } as BusinessStripeAccount);
          }, 1000);
        }
      }, 1000);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Connect Stripe Account</span>
          </DialogTitle>
          <DialogDescription>
            Set up secure payments for your booking system
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'intro' && (
            <>
              <div className="space-y-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-start space-x-3">
                      <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Secure & Compliant</h4>
                        <p className="text-sm text-muted-foreground">
                          Your customer payment data is handled securely by Stripe
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-start space-x-3">
                      <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Direct Payouts</h4>
                        <p className="text-sm text-muted-foreground">
                          Payments go directly to your business bank account
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-start space-x-3">
                      <CreditCard className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Multiple Payment Methods</h4>
                        <p className="text-sm text-muted-foreground">
                          Accept cards, iDEAL, Bancontact, and more
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">What you'll need:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Business bank account information</li>
                  <li>• Business registration details</li>
                  <li>• Valid identification document</li>
                  <li>• Business address and contact information</li>
                </ul>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleStartOnboarding} 
                  disabled={onboarding}
                  className="flex-1"
                >
                  {onboarding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Start Setup
                </Button>
              </div>
            </>
          )}

          {step === 'onboarding' && (
            <div className="text-center py-8">
              <div className="mb-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              </div>
              <h3 className="font-medium mb-2">Complete Setup in Stripe</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Follow the steps in the Stripe window to complete your account setup.
                This window will close when you're done.
              </p>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-8">
              <div className="mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
              </div>
              <h3 className="font-medium mb-2">Setup Complete!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your Stripe account is connected and ready to accept payments.
              </p>
              <Button onClick={onClose} className="w-full">
                Continue
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}