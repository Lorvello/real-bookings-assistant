import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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

// A stale-tab trial/subscription status is a real business-impact bug, not just
// cosmetic: an already-expired trial can keep showing full paid-feature access
// (see P4-STALEPROFILE, IUX R14/R15) until a hard reload. Refetch cheaply on
// visibility/focus-regain (near-zero cost while the tab is hidden, catches the
// realistic "left it open, came back" case) AND on a periodic backstop interval
// for a tab that's never actually blurred/hidden. This is a trial-status check,
// not a real-time feed, so the interval is intentionally coarse to avoid
// needlessly burning Supabase read-quota.
const STATUS_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export const UserStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile, refetch: refetchProfile } = useProfile();
  const { tiers } = useSubscriptionTiers();
  const { t, i18n } = useTranslation('app');
  
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
  
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
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
  // Latest profile id, readable from the visibility/focus/interval effect below
  // without re-subscribing those listeners on every profile change.
  const profileIdRef = useRef<string | undefined>(profile?.id);
  profileIdRef.current = profile?.id;

  const fetchUserStatus = React.useCallback(async (userId: string) => {
    // Admin-bypass fix: do NOT short-circuit on cache before role check
    // We intentionally skip the early cache return so we can always verify admin role first.
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;

    try {
      // STEP 1: Check admin role FIRST (priority check) using SECURITY DEFINER RPC
      const { data: isAdminResult } = await supabase
        .rpc('has_role', { _user_id: userId, _role: 'admin' });

      const adminStatus = isAdminResult === true;
      setIsAdmin(adminStatus);

      // If admin, skip subscription check and set admin status
      if (adminStatus) {
        console.info('[UserStatusContext] Admin detected via has_role RPC');
        setUserStatusType('admin');

        // Cache admin status
        try {
          sessionStorage.setItem(USER_STATUS_CACHE_KEY, JSON.stringify({
            version: CACHE_VERSION,
            data: { userStatusType: 'admin' },
            userId,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error('Error caching admin status:', error);
        }

        setIsLoading(false);
        initialLoadComplete.current = true;
        fetchInProgress.current = false;
        return; // Early return for admin
      }

      // STEP 2: For non-admins, check subscription status normally
      const { data, error } = await supabase
        .rpc('get_user_status_type', { p_user_id: userId });

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
            userId,
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
  }, []);

  // Single fetch on mount / on user switch - never refetch on plain SPA navigation.
  useEffect(() => {
    if (!profile?.id || initialLoadComplete.current) return;
    fetchUserStatus(profile.id);
  }, [profile?.id, fetchUserStatus]);

  // P4-STALEPROFILE fix: a long-open tab must eventually notice a trial/subscription
  // change (most importantly: an expired trial) without requiring a hard reload or
  // re-login. Two triggers, both cheap and both re-deriving from the real DB:
  //  (a) document visibilitychange -> visible, and window focus: near-zero cost
  //      while the tab is hidden/blurred, catches the realistic "left it open,
  //      came back" case immediately.
  //  (b) a 10-minute periodic backstop for a tab that is kept foregrounded and
  //      never blurred/hidden (so (a) never fires). This is a trial-status check,
  //      not a live feed, so the interval is intentionally coarse.
  // Both call the SAME profile + status refetch used everywhere else, and this
  // effect lives in UserStatusProvider, which App.tsx mounts exactly once for the
  // whole app - so this never multiplies into per-component polling regardless of
  // how many components separately call useProfile()/useUserStatus().
  useEffect(() => {
    const revalidate = () => {
      const userId = profileIdRef.current;
      if (!userId) return;
      // Force a fresh fetch even though initialLoadComplete is already true.
      initialLoadComplete.current = false;
      refetchProfile();
      fetchUserStatus(userId);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') revalidate();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', revalidate);
    const intervalId = window.setInterval(revalidate, STATUS_REFRESH_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', revalidate);
      window.clearInterval(intervalId);
    };
  }, [fetchUserStatus, refetchProfile]);

  // Effective subscription tier — SOURCE-OF-TRUTH RECONCILIATION.
  // get_user_status_type() decides "paid_subscriber" from the `subscribers` table,
  // but the tier used for feature-gating below reads `users.subscription_tier`. The
  // real Stripe path (check-subscription) keeps both in sync, but if they ever drift
  // (e.g. a subscribers row without the users mirror), a CONFIRMED paying customer
  // would fall through to the locked default and be told "Upgrade to Pro". So we read
  // the tier straight from `subscribers` (self-readable via the select_own_subscription
  // RLS policy) and use it as the authoritative fallback. Only grants a tier when
  // subscribed=true, so it can never over-grant a non-paying user.
  const [subscriberTier, setSubscriberTier] = useState<string | null>(null);
  useEffect(() => {
    if (!profile?.id) { setSubscriberTier(null); return; }
    let cancelled = false;
    supabase
      .from('subscribers')
      .select('subscription_tier, subscribed')
      .eq('user_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setSubscriberTier(data?.subscribed ? (data.subscription_tier ?? null) : null);
        }
      });
    return () => { cancelled = true; };
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

      // Background verify-and-correct: for non-paid statuses the DB write has
      // already completed before this call (dev status apply, cancellation, etc.),
      // so the DB is authoritative. If the optimistic value ever diverges from
      // get_user_status_type, self-correct the UI + cache instead of waiting for a
      // full reload. (The paid_subscriber branch intentionally keeps optimistic to
      // tolerate Stripe webhook propagation lag — this branch has no such lag.)
      setTimeout(async () => {
        try {
          const { data } = await supabase.rpc('get_user_status_type', { p_user_id: profile.id });
          if (data && data !== normalizedStatus) {
            console.log('[UserStatusContext] DB status diverged from optimistic:', data, '!=', normalizedStatus, '- correcting UI');
            setUserStatusType(data);
            try {
              sessionStorage.setItem(USER_STATUS_CACHE_KEY, JSON.stringify({
                version: CACHE_VERSION,
                data: { userStatusType: data },
                userId: profile.id,
                timestamp: Date.now()
              }));
            } catch (cacheError) {
              console.error('Error caching corrected status:', cacheError);
            }
          } else {
            console.log('[UserStatusContext] Background verification confirmed status:', normalizedStatus);
          }
        } catch (error) {
          console.error('[UserStatusContext] Background verification error:', error);
        }
      }, 1500);

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
        statusMessage: t('app.status.msg.loading', 'Loading...'),
        statusColor: 'gray',
        isSetupIncomplete: false,
        isStatusLoading: true
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
        statusMessage: t('app.status.msg.loading', 'Loading...'),
        statusColor: 'gray',
        isSetupIncomplete: false,
        isStatusLoading: true
      };
    }

    const now = new Date();
    const trialEndDate = profile.trial_end_date ? new Date(profile.trial_end_date) : null;
    const subscriptionEndDate = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
    const gracePeriodEnd = profile?.grace_period_end ? new Date(profile.grace_period_end) : null;

    const daysRemaining = trialEndDate 
      ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Map status type to user status
    let userType: UserType = 'unknown';
    let statusMessage = '';
    let statusColor: 'green' | 'yellow' | 'red' | 'gray' = 'gray';

    const gracePeriodActive = gracePeriodEnd && now <= gracePeriodEnd;

    // ADMIN BYPASS: Admins get full access always
    if (userStatusType === 'admin') {
      userType = 'subscriber'; // Treat as active subscriber
      statusMessage = t('app.status.msg.admin', '👑 Admin Account - Full Access');
      statusColor = 'green';
    }

    switch (userStatusType) {
      case 'admin':
        // Admin case already handled above, this prevents fall-through
        break;
      case 'active_trial':
        userType = 'trial';
        statusMessage = daysRemaining === 1
          ? t('app.status.trialDaysOne', '{{count}} Day Free Trial Remaining', { count: daysRemaining })
          : t('app.status.trialDaysOther', '{{count}} Days Free Trial Remaining', { count: daysRemaining });
        statusColor = daysRemaining <= 1 ? 'red' : daysRemaining <= 3 ? 'yellow' : 'green';
        break;
      case 'expired_trial':
        userType = 'expired_trial';
        statusMessage = t('app.status.msg.trialExpired', 'Trial Expired. Upgrade Now');
        statusColor = 'red';
        break;
      case 'missed_payment_grace':
        userType = 'missed_payment';
        statusMessage = t('app.status.msg.paymentGrace', 'Payment Issue - Grace Period Active');
        statusColor = 'yellow';
        break;
      case 'missed_payment':
        userType = 'missed_payment';
        statusMessage = t('app.status.msg.paymentUpdate', 'Payment Issue - Update Payment Method');
        statusColor = 'red';
        break;
      case 'paid_subscriber':
        userType = 'subscriber';
        statusMessage = t('app.status.msg.activeSubscription', 'Active Subscription');
        statusColor = 'green';
        break;
      case 'canceled_but_active':
        userType = 'canceled_subscriber';
        const remainingDays = subscriptionEndDate 
          ? Math.ceil((subscriptionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        statusMessage = remainingDays > 0
          ? (remainingDays === 1
              ? t('app.status.msg.subEndsInOne', 'Subscription ends in {{count}} day', { count: remainingDays })
              : t('app.status.msg.subEndsInOther', 'Subscription ends in {{count}} days', { count: remainingDays }))
          : t('app.status.msg.subEndingSoon', 'Subscription ending soon');
        statusColor = 'yellow';
        break;
      case 'canceled_and_inactive':
        userType = 'canceled_and_inactive';
        statusMessage = t('app.status.msg.subCancelledExpired', 'Subscription Cancelled and Expired. Upgrade');
        statusColor = 'red';
        break;
      case 'setup_incomplete':
        userType = 'setup_incomplete';
        statusMessage = t('app.status.msg.completeSetupTrial', 'Complete Setup to Start Trial');
        statusColor = 'yellow';
        break;
      default:
        userType = 'unknown';
        statusMessage = t('app.status.msg.unknown', 'Unknown Status');
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
      isSetupIncomplete,
      isStatusLoading: false
    };
    // i18n.language + t are deps so statusMessage recomputes on EN<->NL toggle
    // (the R28 stale-on-toggle gotcha, here at context level).
  }, [profile, userStatusType, isLoading, t, i18n.language]);

  // Get subscription tier limits from database
  const getSubscriptionTierLimits = (tierName: string | null) => {
    if (!tiers || !tierName) return null;
    return tiers.find(tier => tier.tier_name === tierName);
  };

  // Compute access control - optimized for performance
  const accessControl: AccessControl = React.useMemo(() => {
    const { userType, hasFullAccess } = userStatus;
    // Prefer the explicit users.subscription_tier; fall back to the subscribers-table
    // tier so a confirmed paid subscriber is never locked out by a null mirror.
    const tier = profile?.subscription_tier ?? subscriberTier;

    // ADMIN BYPASS: Admins get FULL unlimited access
    if (userStatusType === 'admin') {
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
        canUseWhiteLabel: true,
        hasPrioritySupport: true,
        canAccessFutureInsights: true,
        canAccessBusinessIntelligence: true,
        canAccessPerformance: true,
        canAccessCustomerSatisfaction: true,
        canAccessTeamMembers: true,
        canAccessTaxCompliance: true,
        maxCalendars: null,         // Unlimited
        maxBookingsPerMonth: null,  // Unlimited
        maxTeamMembers: 999,        // Effectively unlimited
        maxWhatsAppContacts: null   // Unlimited
      };
    }

    // For active subscribers — and missed-payment users still inside their grace
    // window — provide full access based on tier. A failed payment must NOT cut a
    // paying customer off immediately: they keep full access during the grace
    // period (with a prominent "update payment" banner) and only lose it when the
    // grace window expires (then userType=missed_payment with hasFullAccess=false
    // falls through to the restricted block below).
    if ((userType === 'subscriber' || (userType === 'missed_payment' && hasFullAccess)) && tier) {
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
    if (userType === 'canceled_subscriber' && tier) {
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

    // Free-tier downgrade set. Lapsed states (missed_payment after grace,
    // expired_trial, canceled_and_inactive) drop to the REAL Free plan rather than
    // being hard-locked: basic single-calendar booking stays usable, but the paid
    // core value (WhatsApp AI, multi-calendar, team, analytics, exports) stays
    // behind the paywall. Existing over-limit data is retained — the maxCalendars
    // limit only blocks creating MORE, it never deletes what's there — so
    // re-subscribing instantly restores everything. Upgrade prompts still show
    // (needsUpgrade/showUpgradePrompt include these states).
    const freeTierLimits = getSubscriptionTierLimits('free');
    const freeTierAccess: AccessControl = {
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
      maxCalendars: freeTierLimits?.max_calendars ?? 1,
      maxBookingsPerMonth: freeTierLimits?.max_bookings_per_month ?? null,
      maxTeamMembers: freeTierLimits?.max_team_members ?? 1,
      maxWhatsAppContacts: 0
    };

    // Missed payment users — AFTER the grace window. During grace they keep full
    // paid access (subscriber block above, gated on hasFullAccess). Once grace
    // expires they downgrade to Free, not a hard lock.
    if (userType === 'missed_payment') {
      return freeTierAccess;
    }

    // Get starter tier limits for trial users
    const starterTierLimits = getSubscriptionTierLimits('starter');

    // Expired trial — used the full product during the trial but never subscribed.
    // Downgrade to Free (single calendar, no WhatsApp AI / analytics) rather than a
    // hard lock, so they stay engaged and can convert. Data retained.
    if (userType === 'expired_trial') {
      return freeTierAccess;
    }

    // Canceled AND inactive — they canceled and the paid period has fully elapsed
    // (canceled_but_active keeps full access until period end, see the
    // canceled_subscriber block above). Downgrade to Free, not a hard lock, so they
    // can keep a single calendar running and re-subscribe anytime. Data retained.
    if (userType === 'canceled_and_inactive') {
      return freeTierAccess;
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
  }, [userStatus, profile?.subscription_tier, subscriberTier, tiers]);

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

// Raw context exported for the no-auth visual harness (launch-ready-loop §7).
export { UserStatusContext };
