import { useEffect } from 'react';
import { useUserStatus } from './useUserStatus';
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
    if (!checkAccess(feature)) {
      // Special handling for WhatsApp for expired trial and canceled_and_inactive users
      if (feature === 'canAccessWhatsApp' && 
          (userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive')) {
        toast({
          title: "WhatsApp Booking Agent Not Active",
          description: "Your booking assistant is not active. Upgrade now or resubscribe to activate it.",
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