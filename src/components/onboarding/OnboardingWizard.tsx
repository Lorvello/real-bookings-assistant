import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, ArrowRight, Settings, Calendar, Clock, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';

export const OnboardingWizard = () => {
  const { t } = useTranslation('app');
  const { completionPercentage, completedSteps, totalSteps, nextSteps, allSteps } = useOnboardingProgress();
  const { userStatus, invalidateCache } = useUserStatus();
  const navigate = useNavigate();
  const [showCreateCalendarDialog, setShowCreateCalendarDialog] = useState(false);
  const promotedRef = useRef(false);

  // When all setup steps are done, the per-step checklist (useOnboardingProgress)
  // flips to 100%, but the GLOBAL user status is fetched once on mount and never
  // refetched during navigation — so it stays 'setup_incomplete' (overlays + gating
  // stay up) until a hard reload, even though setup is finished. Force a status
  // re-query the moment we reach 100% so the trial unlocks seamlessly. The ref guards
  // against repeat calls; once the status leaves setup_incomplete the guard below stops.
  useEffect(() => {
    if (completionPercentage === 100 && userStatus.isSetupIncomplete && !promotedRef.current) {
      promotedRef.current = true;
      invalidateCache();
    }
  }, [completionPercentage, userStatus.isSetupIncomplete, invalidateCache]);

  // Hide setup section when all steps are completed
  if (!userStatus.isSetupIncomplete || completionPercentage === 100) {
    return null;
  }

  const getStepIcon = (step: any) => {
    switch (step.key) {
      case 'business_info':
        return Settings;
      case 'service_types':
        return Bot;
      case 'calendar_creation':
        return Calendar;
      case 'availability':
        return Clock;
      default:
        return Circle;
    }
  };

  const getStepAction = (step: any) => {
    switch (step.key) {
      case 'business_info':
        return () => navigate('/settings?tab=knowledge');
      case 'service_types':
        return () => navigate('/settings?tab=services');
      case 'calendar_creation':
        return () => setShowCreateCalendarDialog(true);
      case 'availability':
        return () => navigate('/availability');
      default:
        return () => navigate('/settings');
    }
  };

  // Clear, labelled call-to-action per step (an icon-only arrow leaves new users
  // guessing what each step does).
  const getStepCta = (step: any) => {
    switch (step.key) {
      case 'business_info':
        return t('app.onboarding.cta.businessInfo', 'Set up');
      case 'service_types':
        return t('app.onboarding.cta.serviceTypes', 'Add services');
      case 'calendar_creation':
        return t('app.onboarding.cta.calendarCreation', 'Create');
      case 'availability':
        return t('app.onboarding.cta.availability', 'Set hours');
      default:
        return t('app.onboarding.cta.default', 'Start');
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden surface-raised rounded-xl p-6 sm:p-8">
        {/* soft brand glow — mono-accent: the primary emerald token, not a stray hue */}
        <div
          className="pointer-events-none absolute inset-x-0 -top-px h-40 opacity-60"
          style={{
            background:
              'radial-gradient(50% 100% at 50% 0%, hsl(var(--primary) / 0.14), transparent 70%)',
          }}
        />

        {/* Header with circular progress */}
        <div className="relative flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-white/10" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${completionPercentage} 100`}
                className="stroke-primary transition-all duration-500 motion-reduce:transition-none"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-foreground">
              {completedSteps}/{totalSteps}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{t('app.onboarding.title', 'Complete your setup')}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {completedSteps === 0
                ? t('app.onboarding.quickSteps', '{{count}} quick steps to your first booking.', { count: totalSteps })
                : totalSteps - completedSteps === 1
                ? t('app.onboarding.stepsToGoOne', '{{count}} step to go, almost there.', { count: totalSteps - completedSteps })
                : t('app.onboarding.stepsToGoOther', '{{count}} steps to go, almost there.', { count: totalSteps - completedSteps })}
            </p>
          </div>
        </div>

        {/* Steps — eased staggered entrance (reduced-motion safe via the .stagger-fade rule) */}
        <div className="relative mt-6 space-y-2.5 stagger-fade">
          {allSteps.map((step) => {
            const StepIcon = getStepIcon(step);
            const isCompleted = step.completed;

            return (
              <div
                key={step.key}
                className={`flex items-center gap-4 rounded-xl border p-4 transition-colors motion-reduce:transition-none ${
                  isCompleted
                    ? 'border-primary/20 bg-primary/[0.06]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-primary/30 hover:bg-primary/[0.04]'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isCompleted ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${isCompleted ? 'text-primary' : 'text-foreground'}`}>
                      {step.name}
                    </h4>
                    {isCompleted && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                        {t('app.onboarding.done', 'Done')}
                      </span>
                    )}
                  </div>
                  <p className={`mt-0.5 text-sm ${isCompleted ? 'text-primary/60' : 'text-muted-foreground'}`}>
                    {step.description}
                  </p>
                </div>

                {!isCompleted && (
                  <Button size="sm" onClick={getStepAction(step)} className="shrink-0 gap-1.5 rounded-lg">
                    {getStepCta(step)}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Create Calendar Dialog */}
      <CreateCalendarDialog 
        open={showCreateCalendarDialog}
        onOpenChange={setShowCreateCalendarDialog}
        onCalendarCreated={() => {
          // Dialog will close automatically and calendar creation will trigger progress update
        }}
      />
    </div>
  );
};