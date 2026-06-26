
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useToast } from '@/hooks/use-toast';

export const useAccessControl = () => {
  const { userStatus, accessControl } = useUserStatus();
  const { toast } = useToast();
  const { t } = useTranslation('app');

  // Auto-update expired users on component mount
  useEffect(() => {
    if (userStatus.userType === 'expired_trial' || userStatus.needsUpgrade) {
      console.log('User needs upgrade:', userStatus.userType);
    }
  }, [userStatus]);

  const checkAccess = (feature: keyof typeof accessControl): boolean => {
    const value = accessControl[feature];
    // For numeric values (like maxCalendars), consider non-zero as true
    return typeof value === 'boolean' ? value : (typeof value === 'number' ? value > 0 : false);
  };

  const requireAccess = (feature: keyof typeof accessControl, onDenied?: () => void) => {
    // STABLE ACCESS: Don't show restrictions during loading/unknown states.
    // Uses the stable isStatusLoading flag (statusMessage is now i18n-translated).
    if (userStatus.isStatusLoading) {
      return true; // Allow access during loading to prevent glitches
    }
    
    if (!checkAccess(feature)) {
      // Special handling for different features
      if (feature === 'canAccessWhatsApp' && 
          (userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive')) {
        toast({
          title: t('app.access.whatsappTitle', 'WhatsApp Booking Agent Not Active'),
          description: t('app.access.whatsappDesc', 'Your booking assistant is not active. Upgrade now or resubscribe to activate it.'),
          variant: "destructive",
        });
      } else if (feature === 'canAccessBusinessIntelligence') {
        toast({
          title: t('app.access.professionalFeature', 'Professional Feature'),
          description: t('app.access.biDesc', 'Business Intelligence is only available for Professional and Enterprise subscriptions.'),
          variant: "destructive",
        });
      } else if (feature === 'canAccessPerformance') {
        toast({
          title: t('app.access.professionalFeature', 'Professional Feature'),
          description: t('app.access.perfDesc', 'Performance & Efficiency is only available for Professional and Enterprise subscriptions.'),
          variant: "destructive",
        });
      } else if (feature === 'canAccessFutureInsights') {
        toast({
          title: t('app.access.professionalFeature', 'Professional Feature'),
          description: t('app.access.futureDesc', 'Future Insights is only available for Professional and Enterprise subscriptions.'),
          variant: "destructive",
        });
      } else if (feature === 'canAccessTeamMembers') {
        toast({
          title: t('app.access.professionalFeature', 'Professional Feature'),
          description: t('app.access.teamDesc', 'Team Members management is only available for Professional and Enterprise subscriptions.'),
          variant: "destructive",
        });
      } else if (feature === 'canAccessTaxCompliance') {
        toast({
          title: t('app.access.professionalFeature', 'Professional Feature'),
          description: t('app.access.taxDesc', 'Tax Compliance is only available for Professional and Enterprise subscriptions.'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('app.toast.accessRestrictedTitle', 'Access Restricted'),
          description: t('app.toast.accessRestrictedDesc', 'This feature requires an active subscription.'),
          variant: "destructive",
        });
      }
      
      if (onDenied) {
        onDenied();
      }
      
      return false;
    }
    return true;
  };

  const withAccessControl = <T extends any[], R>(
    feature: keyof typeof accessControl,
    callback: (...args: T) => R,
    onDenied?: () => void
  ) => {
    return (...args: T): R | undefined => {
      if (requireAccess(feature, onDenied)) {
        return callback(...args);
      }
      return undefined;
    };
  };

  return {
    userStatus,
    accessControl,
    checkAccess,
    requireAccess,
    withAccessControl
  };
};
