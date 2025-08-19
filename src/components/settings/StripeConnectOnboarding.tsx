import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, ExternalLink, CheckCircle, Shield, Check, Info } from 'lucide-react';
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
  const [step, setStep] = useState<'intro' | 'onboarding' | 'complete'>('intro');

  const requirements = [
    'Business bank account details',
    'Business registration or tax ID', 
    'Valid ID of representative (passport or ID card)',
    'Date of birth and address of representative',
    'Beneficial ownership details (if applicable)'
  ];

  const handleStartOnboarding = async () => {
    const onboardingLink = await createOnboardingLink(calendarId);
    
    if (onboardingLink) {
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
              {/* Why we recommend this */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-3 text-foreground flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span>Why we recommend this</span>
                </h4>
                <TooltipProvider>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Upfront payments help your business run more smoothly. They{' '}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="underline cursor-help">reduce no-shows</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Studies show upfront payments lower missed appointments by 35–50% (National Library of Medicine, JMIR).</p>
                      </TooltipContent>
                    </Tooltip>
                    , create{' '}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="underline cursor-help">faster cashflow</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Businesses receive funds 2–3x quicker with upfront payments (Stripe/Square merchant reports).</p>
                      </TooltipContent>
                    </Tooltip>
                    , and keep everything{' '}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="underline cursor-help">secure & compliant</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Stripe is PCI DSS Level 1, PSD2, and EU KYC/AML compliant, ensuring safe and legal transactions.</p>
                      </TooltipContent>
                    </Tooltip>
                    .
                  </p>
                </TooltipProvider>
              </div>

              {/* Requirements */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-3 text-foreground">What you'll need</h4>
                <ul className="space-y-2">
                  {requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{requirement}</span>
                    </li>
                  ))}
                </ul>
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