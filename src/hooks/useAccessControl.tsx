
import { useEffect } from 'react';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useToast } from '@/hooks/use-toast';

export const useAccessControl = () => {
  const { userStatus, accessControl } = useUserStatus();
  const { toast } = useToast();

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
    // STABLE ACCESS: Don't show restrictions during loading/unknown states
    if (userStatus.userType === 'unknown' && userStatus.statusMessage === 'Loading...') {
      return true; // Allow access during loading to prevent glitches
    }
    
    if (!checkAccess(feature)) {
      // Special handling for different features
      if (feature === 'canAccessWhatsApp' && 
          (userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive')) {
        toast({
          title: "WhatsApp Booking Agent Not Active",
          description: "Your booking assistant is not active. Upgrade now or resubscribe to activate it.",
          variant: "destructive",
        });
      } else if (feature === 'canAccessBusinessIntelligence') {
        toast({
          title: "Professional Feature",
          description: "Business Intelligence is alleen beschikbaar voor Professional en Enterprise abonnementen.",
          variant: "destructive",
        });
      } else if (feature === 'canAccessPerformance') {
        toast({
          title: "Professional Feature", 
          description: "Performance & Efficiency is alleen beschikbaar voor Professional en Enterprise abonnementen.",
          variant: "destructive",
        });
      } else if (feature === 'canAccessFutureInsights') {
        toast({
          title: "Professional Feature",
          description: "Future Insights is alleen beschikbaar voor Professional en Enterprise abonnementen.",
          variant: "destructive",
        });
      } else if (feature === 'canAccessTeamMembers') {
        toast({
          title: "Professional Feature",
          description: "Team Members management is alleen beschikbaar voor Professional en Enterprise abonnementen.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Access Restricted",
          description: `This feature requires an active subscription.`,
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
