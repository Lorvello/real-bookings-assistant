import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SetupProgress } from './SetupProgress';
import { TimezoneSelector } from '../timezone/TimezoneSelector';
import { WeeklySchedule } from '../schedule/WeeklySchedule';
import { useAvailabilitySetup } from '@/hooks/availability/useAvailabilitySetup';

interface SetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const {
    currentStepIndex,
    setupSteps,
    nextStep,
    previousStep,
    canProceed,
    completeSetup,
    isCompleting,
    availabilityManager,
    timezoneManager,
  } = useAvailabilitySetup();

  const handleComplete = async () => {
    const success = await completeSetup();
    if (success) {
      onComplete();
    }
  };

  const renderStepContent = () => {
    switch (currentStepIndex) {
      case 0: // Timezone
        return (
          <div className="space-y-6">
            <TimezoneSelector 
              showCard={false}
              onTimezoneChange={() => {
                // Timezone change handled by the component
              }}
            />
          </div>
        );

      case 1: // Schedule
        return (
          <div className="space-y-6">
            <WeeklySchedule
              weeklySchedule={availabilityManager.weeklySchedule}
              readOnly={false}
            />
          </div>
        );

      case 2: // Review
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-primary mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Ready to Complete Setup</h3>
                <p className="text-muted-foreground">
                  Your availability settings are configured and ready to be saved.
                </p>
              </div>
            </div>

            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <h4 className="font-medium">Timezone</h4>
                <p className="text-sm text-muted-foreground">
                  {timezoneManager.currentTimezone}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium">Available Days</h4>
                <p className="text-sm text-muted-foreground">
                  {Object.entries(availabilityManager.weeklySchedule)
                    .filter(([_, day]) => day.enabled)
                    .map(([dayKey]) => dayKey.charAt(0).toUpperCase() + dayKey.slice(1))
                    .join(', ')}
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-4xl bg-background border-border/50 shadow-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-center text-xl font-bold">
            Configure Your Availability
          </DialogTitle>
          
          <SetupProgress 
            steps={setupSteps} 
            currentStepIndex={currentStepIndex} 
          />
        </DialogHeader>

        <div className="py-6">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border/40">
          <Button
            variant="outline"
            onClick={previousStep}
            disabled={currentStepIndex === 0}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          <div className="flex items-center space-x-2">
            {currentStepIndex < setupSteps.length - 1 ? (
              <Button
                onClick={nextStep}
                disabled={!canProceed}
                className="flex items-center space-x-2"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!canProceed || isCompleting}
                className="flex items-center space-x-2"
              >
                {isCompleting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    <span>Completing Setup...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Complete Setup</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};