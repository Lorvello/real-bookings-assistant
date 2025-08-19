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
import { Loader2, ExternalLink, CheckCircle, Shield } from 'lucide-react';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useSettingsContext } from '@/contexts/SettingsContext';
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
  const { businessData } = useSettingsContext();
  const [step, setStep] = useState<'intro' | 'onboarding' | 'complete'>('intro');

  // Dynamic checklist - determine what the user still needs to provide
  const getMissingRequirements = () => {
    const requirements = [];
    // Always needed for NL Stripe Express accounts
    requirements.push('Business bank account (IBAN)');
    requirements.push('KvK-nummer (NL business registration)');
    requirements.push('Valid ID of representative/UBO (if requested)');
    return requirements;
  };

  const getPrefilledItems = () => {
    const items = [];
    if (businessData.business_name) items.push('Company name');
    if (businessData.business_street && businessData.business_city) items.push('Business address');
    if (businessData.business_email || businessData.business_phone) items.push('Contact details (email, phone)');
    // Add website if available in business data in the future
    items.push('Description of services');
    return items;
  };

  const handleStartOnboarding = async () => {
    const onboardingLink = await createOnboardingLink(calendarId);
    
    if (onboardingLink) {
      // Redirect to Stripe onboarding in the same tab
      window.location.href = onboardingLink.url;
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-green-600" />
            <span>Connect Stripe Account</span>
          </DialogTitle>
          <DialogDescription>
            Enable Pay & Book for secure upfront payments.
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
                        <h4 className="font-medium text-green-600">Reduce no-shows</h4>
                        <p className="text-sm text-muted-foreground">
                          Upfront payments significantly lower missed appointments.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-start space-x-3">
                      <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-600">Faster cash flow</h4>
                        <p className="text-sm text-muted-foreground">
                          Receive funds sooner instead of waiting until after the booking.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-start space-x-3">
                      <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-600">Secure & compliant</h4>
                        <p className="text-sm text-muted-foreground">
                          Stripe processes payments safely and meets EU/PSD2 standards.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                <div>
                  <h4 className="font-medium mb-2 text-foreground">What you'll still need</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {getMissingRequirements().map((requirement, index) => (
                      <li key={index}>• {requirement}</li>
                    ))}
                  </ul>
                </div>
                
                {getPrefilledItems().length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-foreground">Already filled from your platform</h4>
                    <ul className="text-sm text-green-600 space-y-1">
                      {getPrefilledItems().map((item, index) => (
                        <li key={index}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleStartOnboarding} 
                  disabled={onboarding}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
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