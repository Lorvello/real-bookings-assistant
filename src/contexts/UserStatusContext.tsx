import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { UserStatus, UserType, AccessControl } from '@/types/userStatus';
import { supabase } from '@/integrations/supabase/client';

interface UserStatusContextType {
  userStatus: UserStatus;
  accessControl: AccessControl;
  isLoading: boolean;
  invalidateCache: (newStatus?: string) => void;
}

const UserStatusContext = createContext<UserStatusContextType | undefined>(undefined);

const USER_STATUS_CACHE_KEY = 'globalUserStatusCache';
const CACHE_VERSION = '3.0';

export const UserStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useProfile();
  
  // Global persistent state - loaded once and maintained across navigation
  const [userStatusType, setUserStatusType] = useState<string>(() => {
    // For paid subscribers, return immediately without any loading
    if (profile?.subscription_status === 'active' && profile?.subscription_tier) {
      return 'paid_subscriber';
    }
    
    // Check cache
    try {
      const cached = sessionStorage.getItem(USER_STATUS_CACHE_KEY);
      if (cached && profile?.id) {
        const { version, data, userId } = JSON.parse(cached);
        if (version === CACHE_VERSION && userId === profile.id) {
          return data.userStatusType || 'unknown';
        }
      }
    } catch (error) {
      console.error('Error loading cached status:', error);
    }
    
    return 'unknown';
  });
  
  // Never show loading for paid subscribers or cached data
  const [isLoading, setIsLoading] = useState(() => {
    if (profile?.subscription_status === 'active' && profile?.subscription_tier) {
      return false;
    }
    
    try {
      const cached = sessionStorage.getItem(USER_STATUS_CACHE_KEY);
      if (cached && profile?.id) {
        const { version, data, userId } = JSON.parse(cached);
        if (version === CACHE_VERSION && userId === profile.id) {
          return false;
        }
      }
    } catch (error) {
      console.error('Error checking cached status:', error);
    }
    
    return true;
  });
  
  const fetchInProgress = useRef(false);
  const initialLoadComplete = useRef(false);

  // Single fetch on mount - never refetch during navigation
  useEffect(() => {
    if (!profile?.id || initialLoadComplete.current) return;

    const fetchUserStatus = async () => {
      // Immediate return for paid subscribers
      if (profile.subscription_status === 'active' && profile.subscription_tier) {
        setUserStatusType('paid_subscriber');
        setIsLoading(false);
        initialLoadComplete.current = true;
        
        // Cache for consistency
        try {
          sessionStorage.setItem(USER_STATUS_CACHE_KEY, JSON.stringify({
            version: CACHE_VERSION,
            data: { userStatusType: 'paid_subscriber' },
            userId: profile.id,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error('Error caching status:', error);
        }
        return;
      }

      // Check cache first
      try {
        const cached = sessionStorage.getItem(USER_STATUS_CACHE_KEY);
        if (cached) {
          const { version, data, userId, timestamp } = JSON.parse(cached);
          if (version === CACHE_VERSION && userId === profile.id) {
            // Use cached data if less than 15 minutes old
            if (Date.now() - timestamp < 15 * 60 * 1000) {
              setUserStatusType(data.userStatusType || 'unknown');
              setIsLoading(false);
              initialLoadComplete.current = true;
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error reading cache:', error);
      }

      // Fetch from database only if necessary
      if (fetchInProgress.current) return;
      fetchInProgress.current = true;

      try {
        const { data, error } = await supabase
          .rpc('get_user_status_type', { p_user_id: profile.id });

        if (error) {
          console.error('Error fetching user status:', error);
          setUserStatusType('unknown');
        } else {
          const status = data || 'unknown';
          setUserStatusType(status);
          
          // Cache the result
          try {
            sessionStorage.setItem(USER_STATUS_CACHE_KEY, JSON.stringify({
              version: CACHE_VERSION,
              data: { userStatusType: status },
              userId: profile.id,
              timestamp: Date.now()
            }));
          } catch (error) {
            console.error('Error caching status:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching user status:', error);
        setUserStatusType('unknown');
      } finally {
        setIsLoading(false);
        fetchInProgress.current = false;
        initialLoadComplete.current = true;
      }
    };

    fetchUserStatus();
  }, [profile?.id]);

  // Invalidate cache and refetch (only used by UserStatusSwitcher)
  const invalidateCache = (newStatus?: string) => {
    if (!profile?.id) return;
    
    try {
      // Clear user status cache
      sessionStorage.removeItem(USER_STATUS_CACHE_KEY);
      
      // Clear profile cache to ensure fresh data
      localStorage.removeItem('userProfile');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
    
    // If we know the new status, update directly without loading state
    if (newStatus) {
      setUserStatusType(newStatus);
      setIsLoading(false);
      initialLoadComplete.current = true;
      
      // Cache the new status
      try {
        sessionStorage.setItem(USER_STATUS_CACHE_KEY, JSON.stringify({
          version: CACHE_VERSION,
          data: { userStatusType: newStatus },
          userId: profile.id,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error caching new status:', error);
      }
      return;
    }
    
    // Fallback to current behavior for unknown status
    initialLoadComplete.current = false;
    fetchInProgress.current = false;
    setIsLoading(true);
    
    // Trigger refetch
    const timer = setTimeout(() => {
      if (profile?.id) {
        initialLoadComplete.current = false;
        // This will trigger the useEffect to run again
        setUserStatusType('unknown');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  };

  // Compute user status - optimized for performance
  const userStatus: UserStatus = React.useMemo(() => {
    // Immediate return for paid subscribers
    if (profile?.subscription_status === 'active' && profile?.subscription_tier) {
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
        statusColor: 'gray',
        isSetupIncomplete: false
      };
    }

    // Show loading only when absolutely necessary
    if (isLoading && !initialLoadComplete.current) {
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

    const daysRemaining = trialEndDate 
      ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Map status type to user status
    let userType: UserType = 'unknown';
    let statusMessage = '';
    let statusColor: 'green' | 'yellow' | 'red' | 'gray' = 'gray';

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
        userType = 'unknown';
        statusMessage = 'Unknown Status';
        statusColor = 'gray';
    }

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
  }, [profile, userStatusType, isLoading]);

  // Compute access control - optimized for performance
  const accessControl: AccessControl = React.useMemo(() => {
    const { userType, hasFullAccess } = userStatus;
    const tier = profile?.subscription_tier;

    // Immediate return for paid subscribers
    if (profile?.subscription_status === 'active' && profile?.subscription_tier) {
      const baseAccess = {
        canViewDashboard: true,
        canCreateBookings: true,
        canEditBookings: true,
        canManageSettings: true,
        canAccessWhatsApp: true,
        canAccessBookingAssistant: true,
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
            canAccessFutureInsights: false,
            canAccessBusinessIntelligence: false,
            canAccessPerformance: false,
            canAccessCustomerSatisfaction: false,
            canAccessTeamMembers: false,
            maxCalendars: 2,
            maxBookingsPerMonth: null,
            maxTeamMembers: 2,
            maxWhatsAppContacts: 500
          };
        case 'professional':
          return {
            ...baseAccess,
            canAccessAPI: true,
            canUseWhiteLabel: false,
            hasPrioritySupport: true,
            canAccessFutureInsights: true,
            canAccessBusinessIntelligence: true,
            canAccessPerformance: true,
            canAccessCustomerSatisfaction: false,
            canAccessTeamMembers: true,
            maxCalendars: null,
            maxBookingsPerMonth: null,
            maxTeamMembers: 5,
            maxWhatsAppContacts: 2500
          };
        case 'enterprise':
          return {
            ...baseAccess,
            canAccessAPI: true,
            canUseWhiteLabel: true,
            hasPrioritySupport: true,
            canAccessFutureInsights: true,
            canAccessBusinessIntelligence: true,
            canAccessPerformance: true,
            canAccessCustomerSatisfaction: true,
            canAccessTeamMembers: true,
            maxCalendars: null,
            maxBookingsPerMonth: null,
            maxTeamMembers: 50,
            maxWhatsAppContacts: null
          };
        default:
          return {
            ...baseAccess,
            canAccessAPI: false,
            canUseWhiteLabel: false,
            hasPrioritySupport: false,
            canAccessFutureInsights: false,
            canAccessBusinessIntelligence: false,
            canAccessPerformance: false,
            canAccessCustomerSatisfaction: false,
            canAccessTeamMembers: false,
            maxCalendars: 2,
            maxBookingsPerMonth: null,
            maxTeamMembers: 2,
            maxWhatsAppContacts: 500
          };
      }
    }

    // Setup incomplete users
    if (userType === 'setup_incomplete') {
      return {
        canViewDashboard: true,
        canCreateBookings: false,
        canEditBookings: false,
        canManageSettings: true,
        canAccessWhatsApp: false,
        canAccessBookingAssistant: false,
        canUseAI: false,
        canExportData: false,
        canInviteUsers: false,
        canAccessAPI: false,
        canUseWhiteLabel: false,
        hasPrioritySupport: false,
        canAccessFutureInsights: false,
        canAccessBusinessIntelligence: false,
        canAccessPerformance: false,
        canAccessCustomerSatisfaction: false,
        canAccessTeamMembers: false,
        maxCalendars: 0,
        maxBookingsPerMonth: 0,
        maxTeamMembers: 0,
        maxWhatsAppContacts: 0
      };
    }

    // Expired trial users
    if (userType === 'expired_trial') {
      return {
        canViewDashboard: true,
        canCreateBookings: true,
        canEditBookings: true,
        canManageSettings: true,
        canAccessWhatsApp: false,
        canAccessBookingAssistant: false,
        canUseAI: true,
        canExportData: true,
        canInviteUsers: false,
        canAccessAPI: false,
        canUseWhiteLabel: false,
        hasPrioritySupport: false,
        canAccessFutureInsights: false,
        canAccessBusinessIntelligence: false,
        canAccessPerformance: false,
        canAccessCustomerSatisfaction: false,
        canAccessTeamMembers: false,
        maxCalendars: 2,
        maxBookingsPerMonth: null,
        maxTeamMembers: 2,
        maxWhatsAppContacts: 500
      };
    }

    // Canceled and inactive users
    if (userType === 'canceled_and_inactive') {
      return {
        canViewDashboard: true,
        canCreateBookings: true,
        canEditBookings: true,
        canManageSettings: true,
        canAccessWhatsApp: false,
        canAccessBookingAssistant: false,
        canUseAI: false,
        canExportData: false,
        canInviteUsers: false,
        canAccessAPI: false,
        canUseWhiteLabel: false,
        hasPrioritySupport: false,
        canAccessFutureInsights: false,
        canAccessBusinessIntelligence: false,
        canAccessPerformance: false,
        canAccessCustomerSatisfaction: false,
        canAccessTeamMembers: false,
        maxCalendars: 1,
        maxBookingsPerMonth: 25,
        maxTeamMembers: 1,
        maxWhatsAppContacts: 0
      };
    }

    // Default access for trial and active users (Starter equivalent)
    return {
      canViewDashboard: true,
      canCreateBookings: hasFullAccess,
      canEditBookings: hasFullAccess,
      canManageSettings: true,
      canAccessWhatsApp: hasFullAccess,
      canAccessBookingAssistant: hasFullAccess,
      canUseAI: hasFullAccess,
      canExportData: hasFullAccess,
      canInviteUsers: hasFullAccess,
      canAccessAPI: false,
      canUseWhiteLabel: false,
      hasPrioritySupport: false,
      canAccessFutureInsights: false,
      canAccessBusinessIntelligence: false,
      canAccessPerformance: false,
      canAccessCustomerSatisfaction: false,
      canAccessTeamMembers: false,
      maxCalendars: hasFullAccess ? 2 : 0,
      maxBookingsPerMonth: hasFullAccess ? null : 0,
      maxTeamMembers: hasFullAccess ? 2 : 0,
      maxWhatsAppContacts: hasFullAccess ? 500 : 0
    };
  }, [userStatus, profile?.subscription_tier]);

  return (
    <UserStatusContext.Provider value={{
      userStatus,
      accessControl,
      isLoading,
      invalidateCache
    }}>
      {children}
    </UserStatusContext.Provider>
  );
};

export const useUserStatus = () => {
  const context = useContext(UserStatusContext);
  if (context === undefined) {
    throw new Error('useUserStatus must be used within a UserStatusProvider');
  }
  return context;
};
