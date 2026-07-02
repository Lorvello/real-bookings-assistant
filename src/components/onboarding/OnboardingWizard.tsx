import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, ArrowRight, Settings, Calendar, Clock, Bot, MessageCircle } from 'lucide-react';
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

        {/* Steps: eased staggered entrance (reduced-motion safe via the .stagger-fade rule).
            The whole row is now clickable for MOUSE users (not just the CTA button),
            with a hover lift plus brighter icon tile, so the row reads as interactive
            instead of a static list with one small clickable corner. Deliberately NOT
            given role="button"/tabIndex: the row already contains a real, correctly
            labelled <Button> for the CTA, and nesting an interactive role/tabstop
            around another real button is invalid ARIA and would double the tab stops
            for keyboard/screen-reader users. Keyboard and AT users reach the same
            action through the real Button below; onClick here is a mouse-only bonus. */}
        <div className="relative mt-6 space-y-2.5 stagger-fade">
          {allSteps.map((step) => {
            const StepIcon = getStepIcon(step);
            const isCompleted = step.completed;
            const action = getStepAction(step);

            return (
              <div
                key={step.key}
                onClick={isCompleted ? undefined : action}
                className={`group flex items-center gap-4 rounded-xl border p-4 transition-all duration-200 motion-reduce:transition-none ${
                  isCompleted
                    ? 'border-primary/20 bg-primary/[0.06]'
                    : 'cursor-pointer border-white/[0.06] bg-white/[0.02] hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/[0.05] hover:shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.35)] motion-reduce:hover:translate-y-0'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isCompleted ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary'
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
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      action();
                    }}
                    className="shrink-0 gap-1.5 rounded-lg transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
                  >
                    {getStepCta(step)}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Orientation footer: fills the empty space below the checklist with a
            forward-looking payoff line instead of dead canvas, so the panel feels
            complete rather than sparse while steps remain open. */}
        <div className="relative mt-6 flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.015] px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <MessageCircle className="h-4 w-4 text-accent-foreground" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground">
            {t('app.onboarding.payoff', 'Once these steps are done, your WhatsApp assistant goes live and starts booking appointments for you.')}
          </p>
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