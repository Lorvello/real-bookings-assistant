import { useMemo, useState, useEffect, useRef } from 'react';
import { useProfile } from './useProfile';
import { UserStatus, UserType, AccessControl } from '@/types/userStatus';
import { supabase } from '@/integrations/supabase/client';

const USER_STATUS_CACHE_KEY = 'userStatusCache';
const USER_STATUS_CACHE_VERSION = '1.0';

export const useUserStatus = () => {
  const { profile, loading: profileLoading } = useProfile();
  
  // Initialize with cached state for persistence across navigation
  const [userStatusType, setUserStatusType] = useState<string>(() => {
    if (profile?.id) {
      try {
        const cached = localStorage.getItem(USER_STATUS_CACHE_KEY);
        if (cached) {
          const { version, data, userId } = JSON.parse(cached);
          if (version === USER_STATUS_CACHE_VERSION && userId === profile.id) {
            return data.userStatusType || 'unknown';
          }
        }
      } catch (error) {
        console.error('Error loading cached user status:', error);
      }
    }
    return 'unknown';
  });
  
  const [isLoading, setIsLoading] = useState(() => {
    // For paid subscribers, never show loading to prevent glitches
    if (profile?.subscription_status === 'active' && profile?.subscription_tier) {
      return false;
    }
    
    // Check if we have cached data
    try {
      const cached = localStorage.getItem(USER_STATUS_CACHE_KEY);
      if (cached && profile?.id) {
        const { version, data, userId } = JSON.parse(cached);
        if (version === USER_STATUS_CACHE_VERSION && userId === profile.id) {
          return false;
        }
      }
    } catch (error) {
      console.error('Error checking cached user status:', error);
    }
    
    return true;
  });

  const fetchInProgress = useRef(false);

  // Get user status type from database function with enhanced caching
  useEffect(() => {
    const fetchUserStatusType = async () => {
      if (!profile?.id) {
        setUserStatusType('unknown');
        setIsLoading(false);
        localStorage.removeItem(USER_STATUS_CACHE_KEY);
        return;
      }

      // For paid subscribers, immediately set status and cache it - NO DATABASE CALL
      if (profile.subscription_status === 'active' && profile.subscription_tier) {
        const status = 'paid_subscriber';
        setUserStatusType(status);
        setIsLoading(false);
        
        // Cache the status with profile data
        try {
          localStorage.setItem(USER_STATUS_CACHE_KEY, JSON.stringify({
            version: USER_STATUS_CACHE_VERSION,
            data: { userStatusType: status },
            userId: profile.id,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error('Error caching user status:', error);
        }
        return;
      }

      // Check if we already have valid cached data
      try {
        const cached = localStorage.getItem(USER_STATUS_CACHE_KEY);
        if (cached) {
          const { version, data, userId, timestamp } = JSON.parse(cached);
          if (version === USER_STATUS_CACHE_VERSION && userId === profile.id) {
            // Use cached data if it's less than 5 minutes old
            const isRecent = Date.now() - timestamp < 5 * 60 * 1000;
            if (isRecent) {
              setUserStatusType(data.userStatusType || 'unknown');
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error reading cached user status:', error);
      }

      // Only fetch from database if we don't have valid cached data
      if (fetchInProgress.current) return;
      fetchInProgress.current = true;

      try {
        const { data, error } = await supabase
          .rpc('get_user_status_type', { p_user_id: profile.id });

        if (error) {
          console.error('Error fetching user status type:', error);
          setUserStatusType('unknown');
        } else {
          const status = data || 'unknown';
          setUserStatusType(status);
          
          // Clear cache after successful database update from UserStatusSwitcher
          localStorage.removeItem(USER_STATUS_CACHE_KEY);
          
          // Cache the result
          try {
            localStorage.setItem(USER_STATUS_CACHE_KEY, JSON.stringify({
              version: USER_STATUS_CACHE_VERSION,
              data: { userStatusType: status },
              userId: profile.id,
              timestamp: Date.now()
            }));
          } catch (error) {
            console.error('Error caching user status:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching user status type:', error);
        setUserStatusType('unknown');
      } finally {
        setIsLoading(false);
        fetchInProgress.current = false;
      }
    };

    fetchUserStatusType();
  }, [profile?.id, profile?.subscription_status, profile?.subscription_tier]);

  const userStatus = useMemo<UserStatus>(() => {
    // FAILSAFE: For paid subscribers, ALWAYS return active status immediately
    const isPaidSubscriber = profile?.subscription_status === 'active' && profile?.subscription_tier;
    
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
    
    // Handle non-paid users
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
        statusMessage: profileLoading ? 'Loading...' : 'Unknown Status',
        statusColor: 'gray',
        isSetupIncomplete: false
      };
    }
    
    // Show loading only for non-paid users
    if (isLoading) {
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

    // Debug logging for status detection
    console.log('🔍 Status Detection Debug:', {
      userStatusType,
      profile: {
        subscription_status: profile.subscription_status,
        subscription_tier: profile.subscription_tier,
        trial_end_date: profile.trial_end_date,
        subscription_end_date: profile.subscription_end_date,
      },
      daysRemaining,
      trialEndDate,
      subscriptionEndDate,
      isTrialActive: trialEndDate && now <= trialEndDate,
      isSubscriptionActive: subscriptionEndDate && now <= subscriptionEndDate
    });

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
        statusMessage = 'Trial Expired. Upgrade Now';
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
        statusMessage = remainingDays > 0 
          ? `Subscription ends in ${remainingDays} day${remainingDays === 1 ? '' : 's'}`
          : 'Subscription ending soon';
        statusColor = 'yellow';
        break;
      case 'canceled_and_inactive':
        userType = 'canceled_and_inactive';
        statusMessage = 'Subscription Cancelled and Expired. Upgrade';
        statusColor = 'red';
        break;
      case 'setup_incomplete':
        userType = 'setup_incomplete';
        statusMessage = 'Complete Setup to Start Trial';
        statusColor = 'yellow';
        break;
      default:
        console.warn('⚠️ Unknown userStatusType detected:', userStatusType);
        userType = 'unknown';
        statusMessage = 'Unknown Status';
        statusColor = 'gray';
    }

    console.log('✅ Final Status Mapping:', {
      userStatusType,
      userType,
      statusMessage,
      statusColor
    });

    // Determine access levels based on user type
    const isTrialActive = userType === 'trial';
    const isExpired = userType === 'expired_trial' && !gracePeriodActive;
    const isSubscriber = userType === 'subscriber';
    const isCanceled = userType === 'canceled_subscriber' || userType === 'canceled_and_inactive';
    const isSetupIncomplete = userType === 'setup_incomplete';
    const hasFullAccess = isTrialActive || isSubscriber || (isCanceled && userType === 'canceled_subscriber') || gracePeriodActive;
    const needsUpgrade = (userType === 'expired_trial' && !gracePeriodActive) || userType === 'canceled_and_inactive';
    const canEdit = hasFullAccess;
    const canCreate = hasFullAccess;
    const showUpgradePrompt = userType === 'expired_trial' || userType === 'canceled_subscriber' || userType === 'canceled_and_inactive';

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

    // FAILSAFE: For paid subscribers, ALWAYS return full access immediately
    const isPaidSubscriber = profile?.subscription_status === 'active' && profile?.subscription_tier;
    if (isPaidSubscriber || (userType === 'subscriber' && profile?.subscription_status === 'active')) {
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

    // Expired trial users have access to everything except WhatsApp (which shows warning)
    if (userType === 'expired_trial') {
      return {
        canViewDashboard: true,
        canCreateBookings: true,
        canEditBookings: true,
        canManageSettings: true,
        canAccessWhatsApp: false, // Special handling: show warning instead of lock
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

    // Canceled and inactive users have limited access
    if (userType === 'canceled_and_inactive') {
      return {
        canViewDashboard: true,
        canCreateBookings: true,
        canEditBookings: true,
        canManageSettings: true,
        canAccessWhatsApp: false, // Special handling: show warning instead of lock
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