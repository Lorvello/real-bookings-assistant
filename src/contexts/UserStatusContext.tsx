import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { UserStatus, UserType, AccessControl } from '@/types/userStatus';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionTiers } from '@/hooks/useSubscriptionTiers';

interface UserStatusContextType {
  userStatus: UserStatus;
  accessControl: AccessControl;
  isLoading: boolean;
  invalidateCache: (newStatus?: string) => Promise<void>;
}

const UserStatusContext = createContext<UserStatusContextType | undefined>(undefined);

const USER_STATUS_CACHE_KEY = 'globalUserStatusCache';
const CACHE_VERSION = '3.0';

export const UserStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useProfile();
  const { tiers } = useSubscriptionTiers();
  
  // Global persistent state - loaded once and maintained across navigation
  const [userStatusType, setUserStatusType] = useState<string>(() => {
    // Check cache first
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
  
  // Show loading only when we have no cached data
  const [isLoading, setIsLoading] = useState(() => {
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

  // Invalidate cache and update status without page reload
  const invalidateCache = async (newStatus?: string) => {
    if (!profile?.id) return;
    
    console.log('[UserStatusContext] Invalidating cache with newStatus:', newStatus);
    
    try {
      // Clear ALL caches completely
      sessionStorage.clear();
      localStorage.removeItem('userProfile');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
    
    // Reset completion flag to force fresh fetch
    initialLoadComplete.current = false;
    fetchInProgress.current = false;
    
    // Normalize 'subscriber' to 'paid_subscriber' for consistency with database
    const normalizedStatus = newStatus === 'subscriber' ? 'paid_subscriber' : newStatus;
    
    // For paid_subscriber status, immediately set and force re-fetch to verify
    if (normalizedStatus === 'paid_subscriber') {
      // Immediately update the UI state for responsiveness
      setUserStatusType('paid_subscriber');
      setIsLoading(false);
      
      // Cache the new status immediately for persistence
      try {
        sessionStorage.setItem(USER_STATUS_CACHE_KEY, JSON.stringify({
          version: CACHE_VERSION,
          data: { userStatusType: 'paid_subscriber' },
          userId: profile.id,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error caching new status:', error);
      }
      
      // Background verification to ensure DB is synced (without blocking UI)
      setTimeout(async () => {
        try {
          console.log('[UserStatusContext] Background verification of paid status...');
          const { data } = await supabase.rpc('get_user_status_type', { p_user_id: profile.id });
          
          if (data === 'paid_subscriber') {
            console.log('[UserStatusContext] Background verification confirmed paid_subscriber status');
          } else {
            console.log('[UserStatusContext] Background verification shows status:', data, '- keeping UI optimistic');
          }
        } catch (error) {
          console.error('[UserStatusContext] Background verification error:', error);
        }
      }, 2000);
      
      return;
    }
    
    // For other statuses, update immediately
    if (normalizedStatus) {
      console.log('[UserStatusContext] Updating user status to:', normalizedStatus);
      setUserStatusType(normalizedStatus);
      setIsLoading(false);
      
      // Cache immediately
      try {
        sessionStorage.setItem(USER_STATUS_CACHE_KEY, JSON.stringify({
          version: CACHE_VERSION,
          data: { userStatusType: normalizedStatus },
          userId: profile.id,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error caching new status:', error);
      }
      
      return;
    }
    
    // For unknown status, force a fresh fetch
    setIsLoading(true);
    setUserStatusType('unknown');
    
    try {
      const { data, error } = await supabase.rpc('get_user_status_type', { p_user_id: profile.id });
      
      if (!error && data) {
        setUserStatusType(data);
        
        // Cache the fresh result
        try {
          sessionStorage.setItem(USER_STATUS_CACHE_KEY, JSON.stringify({
            version: CACHE_VERSION,
            data: { userStatusType: data },
            userId: profile.id,
            timestamp: Date.now()
          }));
        } catch (cacheError) {
          console.error('Error caching fresh status:', cacheError);
        }
      }
    } catch (error) {
      console.error('[UserStatusContext] Error fetching fresh status:', error);
    } finally {
      setIsLoading(false);
      initialLoadComplete.current = true;
    }
  };

  // Compute user status - optimized for performance
  const userStatus: UserStatus = React.useMemo(() => {

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
      case 'missed_payment':
        userType = 'missed_payment';
        statusMessage = 'Payment Issue - Update Payment Method';
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
    const needsUpgrade = (userType === 'expired_trial' && !gracePeriodActive) || userType === 'canceled_and_inactive' || userType === 'missed_payment';
    const canEdit = hasFullAccess;
    const canCreate = hasFullAccess;
    const showUpgradePrompt = userType === 'expired_trial' || userType === 'canceled_subscriber' || userType === 'canceled_and_inactive' || userType === 'missed_payment';

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

  // Get subscription tier limits from database
  const getSubscriptionTierLimits = (tierName: string | null) => {
    if (!tiers || !tierName) return null;
    return tiers.find(tier => tier.tier_name === tierName);
  };

  // Compute access control - optimized for performance
  const accessControl: AccessControl = React.useMemo(() => {
    const { userType, hasFullAccess } = userStatus;
    const tier = profile?.subscription_tier;

    // For active subscribers, provide full access based on tier
    if (userType === 'subscriber' && profile?.subscription_tier) {
      const tierLimits = getSubscriptionTierLimits(tier);
      
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
            canAccessTaxCompliance: false,
            maxCalendars: tierLimits?.max_calendars || 2,
            maxBookingsPerMonth: tierLimits?.max_bookings_per_month || null,
            maxTeamMembers: tierLimits?.max_team_members || 1,
            maxWhatsAppContacts: null
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
            canAccessTaxCompliance: true,
            maxCalendars: tierLimits?.max_calendars,
            maxBookingsPerMonth: tierLimits?.max_bookings_per_month,
            maxTeamMembers: tierLimits?.max_team_members || 10,
            maxWhatsAppContacts: null
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
            canAccessTaxCompliance: true,
            maxCalendars: tierLimits?.max_calendars,
            maxBookingsPerMonth: tierLimits?.max_bookings_per_month,
            maxTeamMembers: tierLimits?.max_team_members,
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
            canAccessTaxCompliance: false,
            maxCalendars: 2,
            maxBookingsPerMonth: null,
            maxTeamMembers: 1,
            maxWhatsAppContacts: null
          };
      }
    }

    // For canceled subscribers who still have active subscription, provide full access based on tier
    if (userType === 'canceled_subscriber' && profile?.subscription_tier) {
      const tierLimits = getSubscriptionTierLimits(tier);
      
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
            canAccessTaxCompliance: false,
            maxCalendars: tierLimits?.max_calendars || 2,
            maxBookingsPerMonth: tierLimits?.max_bookings_per_month || null,
            maxTeamMembers: tierLimits?.max_team_members || 1,
            maxWhatsAppContacts: null
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
            canAccessTaxCompliance: true,
            maxCalendars: tierLimits?.max_calendars,
            maxBookingsPerMonth: tierLimits?.max_bookings_per_month,
            maxTeamMembers: tierLimits?.max_team_members || 10,
            maxWhatsAppContacts: null
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
            canAccessTaxCompliance: true,
            maxCalendars: tierLimits?.max_calendars,
            maxBookingsPerMonth: tierLimits?.max_bookings_per_month,
            maxTeamMembers: tierLimits?.max_team_members,
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
            canAccessTaxCompliance: false,
            maxCalendars: 2,
            maxBookingsPerMonth: null,
            maxTeamMembers: 1,
            maxWhatsAppContacts: null
          };
      }
    }

    // Setup incomplete users - but respect their subscription tier for trial benefits
    if (userType === 'setup_incomplete') {
      // If user has a professional tier assigned (30-day trial), give them professional access during setup
      if (profile?.subscription_tier === 'professional') {
        const professionalTierLimits = getSubscriptionTierLimits('professional');
        return {
          canViewDashboard: true,
          canCreateBookings: true,
          canEditBookings: true,
          canManageSettings: true,
          canAccessWhatsApp: true,
          canAccessBookingAssistant: true,
          canUseAI: true,
          canExportData: true,
          canInviteUsers: true,
          canAccessAPI: true,
          canUseWhiteLabel: false,
          hasPrioritySupport: true,
          canAccessFutureInsights: true,
          canAccessBusinessIntelligence: true,
          canAccessPerformance: true,
          canAccessCustomerSatisfaction: false,
          canAccessTeamMembers: true,
          canAccessTaxCompliance: true,
          maxCalendars: professionalTierLimits?.max_calendars,
          maxBookingsPerMonth: professionalTierLimits?.max_bookings_per_month,
          maxTeamMembers: professionalTierLimits?.max_team_members || 10,
          maxWhatsAppContacts: null
        };
      }
      
      // Default setup incomplete access (no tier assigned)
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
        canAccessTaxCompliance: false,
        maxCalendars: 0,
        maxBookingsPerMonth: 0,
        maxTeamMembers: 0,
        maxWhatsAppContacts: 0
      };
    }

    // Missed payment users - restricted access like expired trial
    if (userType === 'missed_payment') {
      return {
        canViewDashboard: true,
        canCreateBookings: false,
        canEditBookings: false,
        canManageSettings: false,
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
        canAccessTaxCompliance: false,
        maxCalendars: 0,
        maxBookingsPerMonth: 0,
        maxTeamMembers: 0,
        maxWhatsAppContacts: 0
      };
    }

    // Get starter tier limits for trial users
    const starterTierLimits = getSubscriptionTierLimits('starter');

    // Get free tier limits for expired/inactive users
    const freeTierLimits = getSubscriptionTierLimits('free');

    // Expired trial users - use free tier
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
        canAccessTaxCompliance: false,
        maxCalendars: freeTierLimits?.max_calendars || 0,
        maxBookingsPerMonth: freeTierLimits?.max_bookings_per_month || null,
        maxTeamMembers: freeTierLimits?.max_team_members || 1,
        maxWhatsAppContacts: null
      };
    }

    // Canceled and inactive users - use free tier
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
        canAccessTaxCompliance: false,
        maxCalendars: freeTierLimits?.max_calendars || 0,
        maxBookingsPerMonth: freeTierLimits?.max_bookings_per_month || null,
        maxTeamMembers: freeTierLimits?.max_team_members || 1,
        maxWhatsAppContacts: null
      };
    }

    // CRITICAL FIX: Check subscription tier for active trial users
    if (userType === 'trial' && profile?.subscription_tier === 'professional') {
      // Give Professional-tier access to trial users with Professional subscription
      const professionalTierLimits = getSubscriptionTierLimits('professional');
      return {
        canViewDashboard: true,
        canCreateBookings: true,
        canEditBookings: true,
        canManageSettings: true,
        canAccessWhatsApp: true,
        canAccessBookingAssistant: true,
        canUseAI: true,
        canExportData: true,
        canInviteUsers: true,
        canAccessAPI: true,
        canUseWhiteLabel: false,
        hasPrioritySupport: true,
        canAccessFutureInsights: true,
        canAccessBusinessIntelligence: true,
        canAccessPerformance: true,
        canAccessCustomerSatisfaction: false,
        canAccessTeamMembers: true,
        canAccessTaxCompliance: true,
        maxCalendars: professionalTierLimits?.max_calendars,
        maxBookingsPerMonth: professionalTierLimits?.max_bookings_per_month,
        maxTeamMembers: professionalTierLimits?.max_team_members || 10,
        maxWhatsAppContacts: null
      };
    }

    // Default access for other trial users and fallback (Starter equivalent)
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
      canAccessTaxCompliance: false,
      maxCalendars: hasFullAccess ? (starterTierLimits?.max_calendars || 2) : 0,
      maxBookingsPerMonth: hasFullAccess ? (starterTierLimits?.max_bookings_per_month || null) : 0,
      maxTeamMembers: hasFullAccess ? (starterTierLimits?.max_team_members || 1) : 0,
      maxWhatsAppContacts: hasFullAccess ? null : 0
    };
  }, [userStatus, profile?.subscription_tier, tiers]);

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
