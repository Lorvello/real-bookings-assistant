import React, { useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Home,
  Settings,
  MessageCircle,
  Clock,
  BookOpen,
  Bot,
  Lock,
  AlertCircle,
  Eye,
  Phone
} from 'lucide-react';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAvailabilityAlerts } from '@/hooks/useAvailabilityAlerts';

interface NavItem {
  name: string;        // stable English identifier (React key + state); never shown raw, see labelKey
  labelKey: string;    // i18n key for the displayed label (EN default == name)
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAccess?: keyof import('@/types/userStatus').AccessControl;
  description?: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', labelKey: 'app.nav.dashboard', href: '/dashboard', icon: Home },
  { name: 'Calendar', labelKey: 'app.nav.calendar', href: '/calendar', icon: Calendar, requiresAccess: 'canCreateBookings', description: 'View and manage calendar' },
  { name: 'Bookings', labelKey: 'app.nav.bookings', href: '/bookings', icon: BookOpen, requiresAccess: 'canCreateBookings', description: 'View and manage bookings' },
  { name: 'Availability', labelKey: 'app.nav.availability', href: '/availability', icon: Clock, description: 'Set your working hours' },
  { name: 'WhatsApp', labelKey: 'app.nav.whatsapp', href: '/conversations', icon: MessageCircle, description: 'WhatsApp conversations' },
  { name: 'Bookings Assistant', labelKey: 'app.nav.bookingsAssistant', href: '/whatsapp-booking-assistant', icon: Phone, description: 'WhatsApp booking assistant setup' },
  { name: 'Test your AI agent', labelKey: 'app.nav.testAi', href: '/test-ai-agent', icon: Bot, requiresAccess: 'canUseAI', description: 'AI assistant features' },
  { name: 'Settings', labelKey: 'app.nav.settings', href: '/settings', icon: Settings },
];

interface AccessControlledNavigationProps {
  isSidebarOpen: boolean;
  onNavigate: (href: string) => void;
  onMobileNavigate?: () => void;
  tooltipsDisabled?: boolean;
}

export function AccessControlledNavigation({ isSidebarOpen, onNavigate, onMobileNavigate, tooltipsDisabled = false }: AccessControlledNavigationProps) {
  const location = useLocation();
  const { t } = useTranslation('app');
  const { userStatus, accessControl } = useUserStatus();
  const { toast } = useToast();
  const { hasAlerts, alertCount } = useAvailabilityAlerts();

  // IUX R10 (P1-NAV): a click that lands while userStatus.isStatusLoading is
  // still true (the auth/profile/access-control fetch chain has not settled
  // yet, real on a genuinely fresh /dashboard landing, 150-400ms in practice)
  // used to be silently dropped by the isStatusLoading guard in
  // handleItemClick below. A real user's first nav click right after landing
  // could land in that window and appear to do nothing. Queue the intent
  // instead of discarding it, and replay it the instant loading finishes, so
  // the click still "does its job" without the guard's safety property
  // (never act on stale/incomplete access-control data) being weakened: the
  // replay runs handleItemClick again from scratch once real data is in.
  const pendingClickRef = useRef<NavItem | null>(null);

  useEffect(() => {
    if (!userStatus.isStatusLoading && pendingClickRef.current) {
      const item = pendingClickRef.current;
      pendingClickRef.current = null;
      handleItemClick(item);
    }
    // handleItemClick is intentionally not in the deps: it is a plain
    // function recreated every render and closes over the same state this
    // effect already re-runs on (userStatus). Adding it would refire the
    // replay on unrelated renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStatus.isStatusLoading]);

  // Memoize navigation items with ULTRA-STABLE state to prevent any flashing
  const navigationItems = useMemo(() => {
    // ULTIMATE FAILSAFE: Multiple checks for paid subscribers to prevent ANY glitches
    // Decoupled from statusMessage (which is now i18n-translated): the enum flags
    // already capture every paid state the old string checks did (paid_subscriber +
    // admin both set userType==='subscriber'/isSubscriber).
    const isPaidSubscriber = userStatus.userType === 'subscriber' || userStatus.isSubscriber;
    
    // STABLE STATUS: Don't process navigation during unknown/loading states
    if (userStatus.isStatusLoading) {
      return navigation.map((item) => ({
        ...item,
        isActive: location.pathname === item.href,
        isRestricted: false // Prevent lock icons during loading
      }));
    }
    
    return navigation.map((item) => {
      const isActive = location.pathname === item.href;
      
      // WhatsApp tab is always accessible (no restrictions)
      if (item.href === '/conversations') {
        return {
          ...item,
          isActive,
          isRestricted: false
        };
      }
      
      // Booking Assistant tab: Lock during setup incomplete
      if (item.href === '/whatsapp-booking-assistant') {
        return {
          ...item,
          isActive,
          isRestricted: userStatus.isSetupIncomplete
        };
      }

      // Test AI Agent tab: Lock during setup incomplete, expired trial, or canceled and inactive
      if (item.href === '/test-ai-agent') {
        return {
          ...item,
          isActive,
          isRestricted: userStatus.isSetupIncomplete || 
                       userStatus.userType === 'expired_trial' ||
                       userStatus.userType === 'canceled_and_inactive'
        };
      }
      
      // Special handling for setup incomplete users - lock specific features
      if (userStatus.userType === 'setup_incomplete') {
        return {
          ...item,
          isActive,
          isRestricted: false // No restrictions for navigation items
        };
      }
      
      // ULTIMATE FAILSAFE: For paid subscribers, NEVER show restrictions under any circumstances
      const isRestricted = isPaidSubscriber 
        ? false 
        : (item.requiresAccess && !accessControl[item.requiresAccess]);

      return {
        ...item,
        isActive,
        isRestricted
      };
    });
  }, [location.pathname, userStatus.userType, userStatus.isSubscriber, userStatus.statusMessage, userStatus.statusColor, accessControl]);

  const handleItemClick = (item: NavItem) => {
    // ULTIMATE FAILSAFE: Multiple checks for paid subscribers to prevent ANY access restrictions
    // Decoupled from statusMessage (which is now i18n-translated): the enum flags
    // already capture every paid state the old string checks did (paid_subscriber +
    // admin both set userType==='subscriber'/isSubscriber).
    const isPaidSubscriber = userStatus.userType === 'subscriber' || userStatus.isSubscriber;
    
    // Don't process clicks during loading/unknown states to prevent glitches:
    // access-control data (isRestricted, tier, etc.) is not settled yet, so
    // acting now could route on wrong info. IUX R10 (P1-NAV): queue the
    // click instead of silently dropping it, the useEffect above replays it
    // (re-running handleItemClick from scratch, so it still checks fresh
    // status) the instant isStatusLoading flips to false.
    if (userStatus.isStatusLoading) {
      pendingClickRef.current = item;
      return;
    }
    
    // WhatsApp tab is always accessible - no restrictions
    if (item.href === '/conversations') {
      onNavigate(item.href);
      onMobileNavigate?.();
      return;
    }
    
    // Booking Assistant tab: Show setup message if incomplete
    if (item.href === '/whatsapp-booking-assistant') {
      if (userStatus.isSetupIncomplete) {
        toast({
          title: t('app.toast.setupRequiredTitle', 'Setup Required'),
          description: t('app.toast.setupRequiredDesc', 'Complete your account setup to access this feature.'),
          variant: "destructive",
        });
        onNavigate('/settings');
        onMobileNavigate?.();
        return;
      }
      onNavigate(item.href);
      onMobileNavigate?.();
      return;
    }
    
    // Test AI Agent tab: Show appropriate message based on user status
    if (item.href === '/test-ai-agent') {
      if (userStatus.isSetupIncomplete) {
        toast({
          title: t('app.toast.setupRequiredTitle', 'Setup Required'),
          description: t('app.toast.setupRequiredDesc', 'Complete your account setup to access this feature.'),
          variant: "destructive",
        });
        onNavigate('/settings');
        onMobileNavigate?.();
        return;
      }
      if (userStatus.userType === 'expired_trial') {
        toast({
          title: t('app.toast.trialExpiredTitle', 'Trial Expired'),
          description: t('app.toast.trialExpiredDesc', 'Upgrade to a premium plan to access the AI agent.'),
          variant: "destructive",
        });
        onNavigate('/settings');
        onMobileNavigate?.();
        return;
      }
      if (userStatus.userType === 'canceled_and_inactive') {
        toast({
          title: t('app.toast.subRequiredTitle', 'Subscription Required'),
          description: t('app.toast.subRequiredDesc', 'Reactivate your subscription to access the AI agent.'),
          variant: "destructive",
        });
        onNavigate('/settings');
        onMobileNavigate?.();
        return;
      }
      onNavigate(item.href);
      onMobileNavigate?.();
      return;
    }
    
    // Special handling for setup incomplete users
    if (userStatus.userType === 'setup_incomplete') {
      // Allow access to all navigation items
      onNavigate(item.href);
      onMobileNavigate?.();
      return;
    }
    
    if (!isPaidSubscriber && item.requiresAccess && !accessControl[item.requiresAccess]) {
      let title = t('app.toast.accessRestrictedTitle', 'Access Restricted');
      let description = t('app.toast.accessRestrictedDesc', 'This feature requires an active subscription.');

      if (userStatus.isExpired) {
        title = t('app.toast.subExpiredTitle', 'Subscription Expired');
        description = t('app.toast.accessRestrictedDesc', 'This feature requires an active subscription.');
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
      onNavigate('/settings');
      onMobileNavigate?.();
      return;
    }

    onNavigate(item.href);
    onMobileNavigate?.();
  };

  return (
    // Visual contract matches the NavItem primitive (src/components/ui/nav-item.tsx) —
    // DESIGN_SPEC §7.5: rest = tertiary text, hover = faint white wash + depth (never a
    // toy scale-up), active = accent wash + soft glow + a left accent bar + lit text.
    // Kept inline (not the primitive itself) so the access-control overlays (lock, alert
    // badge) can layer over the icon; all behaviour is preserved verbatim.
    <nav className="flex-1 space-y-1 px-2 py-4">
        {navigationItems.map((item) => (
          <button
            key={item.name}
            onClick={() => handleItemClick(item)}
            title={!isSidebarOpen ? t(item.labelKey, item.name) : undefined}
            aria-disabled={userStatus.isStatusLoading || undefined}
            className={`
              group relative flex items-center w-full text-left rounded-md outline-none
              transition-[background-color,color,box-shadow,opacity] duration-150 min-h-[44px] touch-manipulation mb-1
              focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1
              ${isSidebarOpen
                ? 'gap-3 px-3 py-2 text-sm font-medium'
                : 'w-12 h-12 justify-center p-0 mx-auto'
              }
              ${userStatus.isStatusLoading
                ? 'opacity-60 cursor-wait'
                : ''
              }
              ${item.isActive
                ? 'bg-primary/[0.12] text-foreground shadow-[0_0_24px_-10px_hsl(var(--primary)/0.55)] hover:bg-primary/[0.14]'
                : item.isRestricted
                  ? 'text-subtle-foreground/70 hover:bg-white/[0.03] cursor-not-allowed'
                  : 'text-subtle-foreground hover:bg-white/[0.05] hover:text-foreground'
              }
            `}
          >
            {/* left accent bar on active (primitive parity) */}
            {item.isActive && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
            )}
            <div className={`relative ${isSidebarOpen ? 'flex-shrink-0' : 'flex items-center justify-center'}`}>
              <item.icon
                className={`h-5 w-5 transition-colors duration-150 ${
                  item.isActive
                    ? 'text-accent-foreground'
                    : item.isRestricted
                      ? 'text-subtle-foreground/60'
                      : 'text-current group-hover:text-foreground'
                }`}
              />
              {item.isRestricted && (
                <div className="absolute -top-1 -right-1">
                  <Lock className="h-3 w-3 text-destructive-foreground" />
                </div>
              )}
              {/* Availability alert badge — attention semantic = gold/warning token, neon pulse kept */}
              {item.href === '/availability' && hasAlerts && !item.isActive && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-warning/40 animate-ping" />
                      <span className="relative flex h-3.5 w-3.5 items-center justify-center rounded-full bg-warning animate-neon-pulse">
                        <AlertCircle className="h-2.5 w-2.5 text-background" />
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{alertCount === 1
                      ? t('app.availabilityAlertOne', '{{count}} calendar needs availability setup', { count: alertCount })
                      : t('app.availabilityAlertOther', '{{count}} calendars need availability setup', { count: alertCount })}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {isSidebarOpen && (
              <span className="truncate">
                {t(item.labelKey, item.name)}
              </span>
            )}
            {isSidebarOpen && item.isRestricted && (
              <div className="ml-auto">
                <Lock className="h-4 w-4 text-destructive-foreground" />
              </div>
            )}
          </button>
        ))}
    </nav>
  );
}
