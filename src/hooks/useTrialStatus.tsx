import { useMemo } from 'react';
import { useProfile } from './useProfile';

export const useTrialStatus = () => {
  const { profile } = useProfile();

  const trialStatus = useMemo(() => {
    if (!profile) {
      return {
        isTrialActive: false,
        daysRemaining: 0,
        trialEndDate: null,
        subscriptionStatus: 'unknown' as const
      };
    }

    const now = new Date();
    const trialEndDate = profile.trial_end_date ? new Date(profile.trial_end_date) : null;
    const isTrialActive = profile.subscription_status === 'trial' && trialEndDate && trialEndDate > now;
    
    const daysRemaining = trialEndDate 
      ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      isTrialActive,
      daysRemaining,
      trialEndDate,
      subscriptionStatus: profile.subscription_status || 'unknown'
    };
  }, [profile]);

  return trialStatus;
};