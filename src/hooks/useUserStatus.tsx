import { useMemo, useState, useEffect } from 'react';
import { useProfile } from './useProfile';
import { UserStatus, UserType, AccessControl } from '@/types/userStatus';
import { supabase } from '@/integrations/supabase/client';

export const useUserStatus = () => {
  const { profile, loading: profileLoading } = useProfile();
  
  // Initialize with optimistic state for paid subscribers to prevent glitches
  const [userStatusType, setUserStatusType] = useState<string>(() => {
    // Try to get from localStorage first for persistence across navigation
    const cached = localStorage.getItem('userStatusType');
    return cached || 'unknown';
  });
  
  const [isLoading, setIsLoading] = useState(() => {
    // For paid subscribers, start with false to prevent loading flash
    const cached = localStorage.getItem('userStatusType');
    return !cached;
  });

  // Get user status type from database function with caching
  useEffect(() => {
    const fetchUserStatusType = async () => {
      if (!profile?.id) {
        setUserStatusType('unknown');
        setIsLoading(false);
        localStorage.removeItem('userStatusType');
        return;
      }

      // For paid subscribers, immediately set status and cache it
      if (profile.subscription_status === 'active' && profile.subscription_tier) {
        setUserStatusType('paid_subscriber');
        setIsLoading(false);
        localStorage.setItem('userStatusType', 'paid_subscriber');
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc('get_user_status_type', { p_user_id: profile.id });

        if (error) {
          console.error('Error fetching user status type:', error);
          setUserStatusType('unknown');
        } else {
          const status = data || 'unknown';
          setUserStatusType(status);
          localStorage.setItem('userStatusType', status);
        }
      } catch (error) {
        console.error('Error fetching user status type:', error);
        setUserStatusType('unknown');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserStatusType();
  }, [profile?.id, profile?.subscription_status, profile?.subscription_tier]);

  const userStatus = useMemo<UserStatus>(() => {
    // For paid subscribers, never show loading state to prevent glitches
    const isPaidSubscriber = profile?.subscription_status === 'active' && profile?.subscription_tier;
    
    if (!profile && !isPaidSubscriber) {
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
        statusMessage: profileLoading ? 'Loading...' : 'Unknown Status',
        statusColor: 'gray',
        isSetupIncomplete: false
      };
    }
    
    // For paid subscribers, immediately return active status regardless of loading states
    if (isPaidSubscriber) {
      return {
        userType: 'subscriber',
        isTrialActive: false,
        isExpired: false,
        isSubscriber: true,
        isCanceled: false,
        hasFullAccess: true,
        daysRemaining: 0,
        gracePeriodActive: false,
        needsUpgrade: false,
        canEdit: true,
        canCreate: true,
        showUpgradePrompt: false,
        statusMessage: 'Active Subscription',
        statusColor: 'green',
        isSetupIncomplete: false
      };
    }
    
    // Show loading only for non-paid users
    if (isLoading && !isPaidSubscriber) {
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
        statusColor: 'gray',
        isSetupIncomplete: false
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

    // Map database status to UserType
    let userType: UserType = 'unknown';
    let statusMessage = '';
    let statusColor: 'green' | 'yellow' | 'red' | 'gray' = 'gray';

    // Check if in grace period
    const gracePeriodActive = gracePeriodEnd && now <= gracePeriodEnd;

    switch (userStatusType) {
      case 'active_trial':
        userType = 'trial';
        statusMessage = daysRemaining === 1 ? '1 Day Free Trial Remaining' : `${daysRemaining} Days Free Trial Remaining`;
        statusColor = daysRemaining <= 1 ? 'red' : daysRemaining <= 3 ? 'yellow' : 'green';
        break;
      case 'expired_trial':
        userType = 'expired_trial';
        statusMessage = 'Trial Expired';
        statusColor = 'red';
        break;
      case 'paid_subscriber':
        userType = 'subscriber';
        statusMessage = 'Active Subscription';
        statusColor = 'green';
        break;
      case 'canceled_but_active':
        userType = 'canceled_subscriber';
        const remainingDays = subscriptionEndDate 
          ? Math.ceil((subscriptionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        statusMessage = `Subscription ending in ${remainingDays} day${remainingDays === 1 ? '' : 's'}`;
        statusColor = 'yellow';
        break;
      case 'setup_incomplete':
        userType = 'setup_incomplete';
        statusMessage = 'Setup Incomplete';
        statusColor = 'yellow';
        break;
      default:
        userType = 'unknown';
        statusMessage = 'Unknown Status';
        statusColor = 'gray';
    }

    // Determine access levels based on user type
    const isTrialActive = userType === 'trial';
    const isExpired = userType === 'expired_trial' && !gracePeriodActive;
    const isSubscriber = userType === 'subscriber';
    const isCanceled = userType === 'canceled_subscriber';
    const isSetupIncomplete = userType === 'setup_incomplete';
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
      statusColor,
      isSetupIncomplete
    };
  }, [profile, userStatusType, profileLoading, isLoading]);

  const accessControl = useMemo<AccessControl>(() => {
    const { userType, hasFullAccess, isExpired } = userStatus;
    const tier = profile?.subscription_tier;

    // For paid subscribers, return full access immediately to prevent glitches
    if (userType === 'subscriber' && profile?.subscription_status === 'active') {
      const baseAccess = {
        canViewDashboard: true,
        canCreateBookings: true,
        canEditBookings: true,
        canManageSettings: true,
        canAccessWhatsApp: true,
        canUseAI: true,
        canExportData: true,
        canInviteUsers: true
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

    // Setup incomplete users have restricted access
    if (userType === 'setup_incomplete') {
      return {
        canViewDashboard: true,
        canCreateBookings: false,
        canEditBookings: false,
        canManageSettings: true,
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