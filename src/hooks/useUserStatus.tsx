import { useMemo } from 'react';
import { useProfile } from './useProfile';
import { UserStatus, UserType, AccessControl } from '@/types/userStatus';

export const useUserStatus = () => {
  const { profile } = useProfile();

  const userStatus = useMemo<UserStatus>(() => {
    if (!profile) {
      return {
        userType: 'unknown',
        isTrialActive: false,
        isExpired: false,
        isSubscriber: false,
        isCanceled: false,
        hasFullAccess: false,
        daysRemaining: 0,
        gracePeriodActive: false,
        needsUpgrade: false,
        canEdit: false,
        canCreate: false,
        showUpgradePrompt: false,
        statusMessage: 'Loading...',
        statusColor: 'gray'
      };
    }

    const now = new Date();
    const trialEndDate = profile.trial_end_date ? new Date(profile.trial_end_date) : null;
    const subscriptionEndDate = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
    const gracePeriodEnd = profile.grace_period_end ? new Date(profile.grace_period_end) : null;

    // Calculate days remaining for trial
    const daysRemaining = trialEndDate 
      ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Determine user type
    let userType: UserType = 'unknown';
    let statusMessage = '';
    let statusColor: 'green' | 'yellow' | 'red' | 'gray' = 'gray';

    // Check if in grace period
    const gracePeriodActive = gracePeriodEnd && now <= gracePeriodEnd;

    if (profile.subscription_status === 'trial') {
      if (trialEndDate && now <= trialEndDate) {
        userType = 'trial';
        statusMessage = daysRemaining === 1 ? '1 Day Free Trial Remaining' : `${daysRemaining} Days Free Trial Remaining`;
        statusColor = daysRemaining <= 1 ? 'red' : daysRemaining <= 3 ? 'yellow' : 'green';
      } else {
        userType = 'expired_trial';
        statusMessage = 'Trial Expired';
        statusColor = 'red';
      }
    } else if (profile.subscription_status === 'active' || profile.subscription_status === 'paid') {
      userType = 'subscriber';
      statusMessage = 'Active Subscription';
      statusColor = 'green';
    } else if (profile.subscription_status === 'canceled') {
      if (subscriptionEndDate && now <= subscriptionEndDate) {
        userType = 'canceled_subscriber';
        const remainingDays = Math.ceil((subscriptionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        statusMessage = `Subscription ending in ${remainingDays} day${remainingDays === 1 ? '' : 's'}`;
        statusColor = 'yellow';
      } else {
        userType = 'expired_trial';
        statusMessage = 'Subscription Expired';
        statusColor = 'red';
      }
    } else if (profile.subscription_status === 'expired') {
      userType = 'expired_trial';
      statusMessage = gracePeriodActive ? 'Grace Period Active' : 'Access Expired';
      statusColor = gracePeriodActive ? 'yellow' : 'red';
    }

    // Determine access levels
    const isTrialActive = userType === 'trial';
    const isExpired = userType === 'expired_trial' && !gracePeriodActive;
    const isSubscriber = userType === 'subscriber';
    const isCanceled = userType === 'canceled_subscriber';
    const hasFullAccess = isTrialActive || isSubscriber || isCanceled || gracePeriodActive;
    const needsUpgrade = userType === 'expired_trial' && !gracePeriodActive;
    const canEdit = hasFullAccess;
    const canCreate = hasFullAccess;
    const showUpgradePrompt = userType === 'expired_trial' || userType === 'canceled_subscriber';

    return {
      userType,
      isTrialActive,
      isExpired,
      isSubscriber,
      isCanceled,
      hasFullAccess,
      daysRemaining,
      subscriptionEndDate: subscriptionEndDate || undefined,
      trialEndDate: trialEndDate || undefined,
      gracePeriodActive: !!gracePeriodActive,
      needsUpgrade,
      canEdit,
      canCreate,
      showUpgradePrompt,
      statusMessage,
      statusColor
    };
  }, [profile]);

  const accessControl = useMemo<AccessControl>(() => {
    const { userType, hasFullAccess, isExpired } = userStatus;
    const tier = profile?.subscription_tier;

    if (isExpired) {
      return {
        canViewDashboard: true,
        canCreateBookings: false,
        canEditBookings: false,
        canManageSettings: false,
        canAccessWhatsApp: false,
        canUseAI: false,
        canExportData: false,
        canInviteUsers: false,
        canAccessAPI: false,
        canUseWhiteLabel: false,
        hasPrioritySupport: false,
        maxCalendars: 0,
        maxBookingsPerMonth: 0,
        maxTeamMembers: 0
      };
    }

    if (userType === 'trial') {
      return {
        canViewDashboard: true,
        canCreateBookings: true,
        canEditBookings: true,
        canManageSettings: true,
        canAccessWhatsApp: true,
        canUseAI: true,
        canExportData: true,
        canInviteUsers: false,
        canAccessAPI: false,
        canUseWhiteLabel: false,
        hasPrioritySupport: false,
        maxCalendars: 1,
        maxBookingsPerMonth: 50,
        maxTeamMembers: 1
      };
    }

    // Tier-based access control for subscribers
    if (userType === 'subscriber' || userType === 'canceled_subscriber') {
      const baseAccess = {
        canViewDashboard: true,
        canCreateBookings: true,
        canEditBookings: true,
        canManageSettings: true,
        canAccessWhatsApp: true,
        canUseAI: true,
        canExportData: true,
        canInviteUsers: userType === 'subscriber'
      };

      switch (tier) {
        case 'starter':
          return {
            ...baseAccess,
            canAccessAPI: false,
            canUseWhiteLabel: false,
            hasPrioritySupport: false,
            maxCalendars: 1,
            maxBookingsPerMonth: 50,
            maxTeamMembers: 1
          };
        case 'professional':
          return {
            ...baseAccess,
            canAccessAPI: true,
            canUseWhiteLabel: false,
            hasPrioritySupport: true,
            maxCalendars: 5,
            maxBookingsPerMonth: 500,
            maxTeamMembers: 5
          };
        case 'enterprise':
          return {
            ...baseAccess,
            canAccessAPI: true,
            canUseWhiteLabel: true,
            hasPrioritySupport: true,
            maxCalendars: 25,
            maxBookingsPerMonth: 10000,
            maxTeamMembers: 50
          };
        default:
          // Default to starter tier limits
          return {
            ...baseAccess,
            canAccessAPI: false,
            canUseWhiteLabel: false,
            hasPrioritySupport: false,
            maxCalendars: 1,
            maxBookingsPerMonth: 50,
            maxTeamMembers: 1
          };
      }
    }

    // Default (unknown/loading)
    return {
      canViewDashboard: false,
      canCreateBookings: false,
      canEditBookings: false,
      canManageSettings: false,
      canAccessWhatsApp: false,
      canUseAI: false,
      canExportData: false,
      canInviteUsers: false,
      canAccessAPI: false,
      canUseWhiteLabel: false,
      hasPrioritySupport: false,
      maxCalendars: 0,
      maxBookingsPerMonth: 0,
      maxTeamMembers: 0
    };
  }, [userStatus, profile]);

  return { userStatus, accessControl };
};