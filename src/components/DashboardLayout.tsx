
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarHeader } from '@/components/dashboard/SidebarHeader';
import { BackToWebsiteButton } from '@/components/dashboard/BackToWebsiteButton';
import { NavigationMenu } from '@/components/dashboard/NavigationMenu';
import { EnhancedNavigationMenu } from '@/components/trial/EnhancedNavigationMenu';
import { AccessControlledNavigation } from '@/components/user-status/AccessControlledNavigation';
import { CalendarSwitcherSection } from '@/components/dashboard/CalendarSwitcherSection';
import { UserProfileSection } from '@/components/dashboard/UserProfileSection';
import { StatusIndicator } from '@/components/user-status/StatusIndicator';
import { UpgradePrompt } from '@/components/user-status/UpgradePrompt';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useToast } from '@/hooks/use-toast';
import { AuthenticatedPageWrapper } from '@/components/AuthenticatedPageWrapper';
import { useNavigationGuard } from '@/contexts/NavigationGuardContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper function to get page title from pathname. Takes `t` so the mobile
// header title follows the EN<->NL toggle; called in the render body (not
// memoized) so it recomputes with the current language.
const getPageTitle = (pathname: string, t: TFunction) => {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0 || segments[0] === 'dashboard') {
    return t('app.pageTitle.dashboard', 'Dashboard');
  }

  // Keys are the first path segment of each logged-in route; titles mirror the
  // sidebar NavigationMenu labels so the mobile header never disagrees with the
  // nav. (The old 'whatsapp'/'bookings-assistant' keys were stale and never
  // matched the real '/whatsapp-booking-assistant' route, so its mobile header
  // fell through to the ugly auto-capitalized 'Whatsapp-booking-assistant'.)
  const pageMap: Record<string, string> = {
    'calendar': t('app.pageTitle.calendar', 'Calendar'),
    'bookings': t('app.pageTitle.bookings', 'Bookings'),
    'availability': t('app.pageTitle.availability', 'Availability'),
    'conversations': t('app.pageTitle.whatsapp', 'WhatsApp'),
    'whatsapp-booking-assistant': t('app.pageTitle.bookingAssistant', 'Booking Assistant'),
    'test-ai-agent': t('app.pageTitle.testAi', 'Test AI Agent'),
    'profile': t('app.pageTitle.profile', 'Profile'),
    'settings': t('app.pageTitle.settings', 'Settings')
  };

  return pageMap[segments[0]] || segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  // AVAILABILITY-INAPP-NAV-STILL-NOOP (IUX R52): every in-app navigation path
  // from this shell (sidebar nav, back-to-website, sign out) routes through
  // guardedNavigate, so a dirty surface (e.g. Weekly-Hours) can intercept it
  // with a real confirm dialog instead of silently losing an unsaved change.
  const { guardedNavigate } = useNavigationGuard();
  const { t } = useTranslation('app');
  const { signOut } = useAuth();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (isMobile) return false; // Mobile always closed
    
    const saved = localStorage.getItem('sidebar-expanded');
    return saved !== null ? JSON.parse(saved) : true; // Default open voor desktop
  });
  const { userStatus, accessControl } = useUserStatus();
  const { toast } = useToast();
  const [tooltipsDisabled, setTooltipsDisabled] = useState(false);

  // Close sidebar on mobile when screen size changes
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  // Auto-close sidebar on route change (mobile only)
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleSignOut = () => {
    guardedNavigate(async () => {
      await signOut();
      navigate('/');
    });
  };

  const handleNavigation = (href: string) => {
    // Production-safe navigation logging removed
    guardedNavigate(() => navigate(href));
  };

  const handleBackToWebsite = () => {
    // Production-safe navigation logging removed
    guardedNavigate(() => navigate('/'));
  };

  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    
    // Disable tooltips for 500ms to prevent flash
    setTooltipsDisabled(true);
    setTimeout(() => setTooltipsDisabled(false), 500);
    
    // Alleen localStorage updaten voor desktop
    if (!isMobile) {
      localStorage.setItem('sidebar-expanded', JSON.stringify(newState));
    }
  };

  const currentPageTitle = getPageTitle(location.pathname, t);

  // Cross-surface title seam: the logged-in app sets no document.title of its own,
  // so the browser tab kept showing whichever public page's SEO title last ran (or
  // the generic index.html default) for EVERY app route. Mirror the same i18n
  // page-title map into the tab so the tab tracks the current app page AND follows
  // the EN<->NL toggle. Reuses the existing `app.pageTitle.*` keys (no new copy to
  // translate beyond the brand suffix). useSEO is public-only; this is its app peer.
  useEffect(() => {
    const suffix = t('app.documentTitleSuffix', 'Bookings Assistant');
    document.title = currentPageTitle === suffix
      ? suffix
      : `${currentPageTitle} | ${suffix}`;
  }, [currentPageTitle, t]);

  return (
    <AuthenticatedPageWrapper>
      <TooltipProvider delayDuration={0} skipDelayDuration={0}>
        <div className="flex h-full bg-background w-full relative overflow-hidden">
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="sidebar-overlay fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Mobile: Complete hide/show, Desktop: Collapsible */}
      <div 
        className={`
          sidebar-transform border-r border-white/[0.06]
          ${isMobile
            ? `fixed left-0 top-0 h-full w-[85%] max-w-sm z-50 
               transition-transform duration-300 ease-out
               ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}` 
            : `${isSidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 ease-in-out flex-shrink-0 relative h-full max-h-full`
          }
        `}
        style={{ backgroundColor: 'hsl(var(--surface-1))' }}
      >
        {/* Ambient accent glow at the top of the spine — atmosphere, not noise */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 z-0"
          style={{ background: 'radial-gradient(80% 55% at 28% 0%, hsl(var(--primary) / 0.10), transparent 70%)' }}
        />
        {/* Only render sidebar content when visible on mobile or always on desktop */}
        {(!isMobile || isSidebarOpen) && (
          <div className={`relative z-10 flex flex-col ${isMobile ? 'h-screen' : 'h-full'} overflow-y-auto dashboard-scrollbar`}>
            <SidebarHeader 
              isSidebarOpen={isSidebarOpen} 
              onToggleSidebar={toggleSidebar}
              isMobile={isMobile}
              tooltipsDisabled={tooltipsDisabled}
            />

            <BackToWebsiteButton 
              isSidebarOpen={isSidebarOpen} 
              onBackToWebsite={handleBackToWebsite}
              tooltipsDisabled={tooltipsDisabled}
            />

            {/* Visual Separator */}
            <div className="w-8 h-px bg-white/[0.08] mx-auto my-4"></div>

            {/* User Status Indicator - Shows for all users */}
            <StatusIndicator 
              userStatus={userStatus} 
              isExpanded={isSidebarOpen}
              tooltipsDisabled={tooltipsDisabled}
            />

            {/* Upgrade Prompt - Shows for expired/canceled users.
                No onUpgrade override: UpgradePrompt routes lapsed PAID states
                (missed_payment / canceled) to the Stripe billing portal
                (manage-subscription) and only trial/fallback to the plan picker.
                Passing onUpgrade here previously forced the plan picker for everyone,
                bypassing that routing. */}
            <UpgradePrompt
              userStatus={userStatus}
              isExpanded={isSidebarOpen}
            />

            {/* Visual Separator */}
            <div className="w-8 h-px bg-white/[0.08] mx-auto my-4"></div>

            {/* Access Controlled Navigation - Adapts to user status */}
            <AccessControlledNavigation 
              isSidebarOpen={isSidebarOpen} 
              onNavigate={handleNavigation}
              onMobileNavigate={() => isMobile && setIsSidebarOpen(false)}
              tooltipsDisabled={tooltipsDisabled}
            />

            {/* Visual Separator */}
            <div className="w-8 h-px bg-white/[0.08] mx-auto my-4"></div>

            <CalendarSwitcherSection isSidebarOpen={isSidebarOpen} />

            {/* Visual Separator */}
            <div className="w-8 h-px bg-white/[0.08] mx-auto my-4"></div>

            <UserProfileSection 
              isSidebarOpen={isSidebarOpen} 
              onSignOut={handleSignOut}
              tooltipsDisabled={tooltipsDisabled}
            />
          </div>
        )}
      </div>

      {/* Mobile Header - Only visible when sidebar is closed on mobile */}
      {isMobile && !isSidebarOpen && (
        <div className="fixed top-0 left-0 right-0 h-16 bg-surface-1/95 backdrop-blur-md border-b border-white/[0.08] z-30 flex items-center px-4" style={{ touchAction: 'pan-y' }}>
          <button
            onClick={() => setIsSidebarOpen(true)}
            aria-label={t('app.openMenu', 'Open menu')}
            className="flex h-11 w-11 items-center justify-center -ml-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-white/[0.06] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="ml-3 text-lg font-semibold text-foreground">{currentPageTitle}</h1>
        </div>
      )}

      {/* Main Content — min-w-0 lets this flex child shrink to the viewport on
          mobile instead of being forced to its content's min-content width
          (which overflowed to ~812px and clipped the logged-in app on phones). */}
      <div className={`flex-1 min-w-0 h-full ${isMobile && !isSidebarOpen ? 'pt-16' : ''}`} style={isMobile ? { overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' } : {}}>
        <main className="w-full h-full overflow-y-auto dashboard-scrollbar">
          {children}
        </main>
      </div>
      </div>
      </TooltipProvider>
    </AuthenticatedPageWrapper>
  );
}
