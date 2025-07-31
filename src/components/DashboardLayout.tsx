
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { AuthenticatedPageWrapper } from '@/components/AuthenticatedPageWrapper';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper function to get page title from pathname
const getPageTitle = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0 || segments[0] === 'dashboard') {
    return 'Dashboard';
  }
  
  const pageMap: Record<string, string> = {
    'calendar': 'Calendar',
    'bookings': 'Bookings',
    'availability': 'Availability',
    'whatsapp': 'WhatsApp',
    'bookings-assistant': 'Bookings Assistant',
    'test-ai-agent': 'Test AI Agent',
    'settings': 'Settings'
  };
  
  return pageMap[segments[0]] || segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (isMobile) return false; // Mobile altijd gesloten
    
    const saved = localStorage.getItem('sidebar-expanded');
    return saved !== null ? JSON.parse(saved) : true; // Default open voor desktop
  });
  const { userStatus, accessControl } = useUserStatus();
  const { toast } = useToast();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleNavigation = (href: string) => {
    console.log('Navigating to:', href);
    navigate(href);
  };

  const handleBackToWebsite = () => {
    console.log('Navigating back to website homepage');
    navigate('/');
  };

  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    
    // Alleen localStorage updaten voor desktop
    if (!isMobile) {
      localStorage.setItem('sidebar-expanded', JSON.stringify(newState));
    }
  };

  const handleUpgrade = () => {
    setShowSubscriptionModal(true);
  };

  const currentPageTitle = getPageTitle(location.pathname);

  return (
    <AuthenticatedPageWrapper>
      <div className="flex h-full bg-gray-900 w-full relative overflow-hidden">
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Mobile: Complete hide/show, Desktop: Collapsible */}
      <div 
        className={`
          ${isMobile 
            ? `fixed left-0 top-0 h-full z-50 transition-all duration-300 ease-in-out
               ${isSidebarOpen 
                 ? 'translate-x-0 opacity-100 pointer-events-auto w-[85%] max-w-sm' 
                 : '-translate-x-full opacity-0 pointer-events-none w-0'
               }` 
            : `${isSidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 ease-in-out flex-shrink-0 relative opacity-100 pointer-events-auto h-full max-h-full`
          }
        `}
        style={{ backgroundColor: '#0F172A' }}
      >
        {/* Only render sidebar content when visible on mobile or always on desktop */}
        {(!isMobile || isSidebarOpen) && (
          <div className="flex h-full flex-col overflow-hidden">
            <SidebarHeader 
              isSidebarOpen={isSidebarOpen} 
              onToggleSidebar={toggleSidebar}
              isMobile={isMobile}
            />

            <BackToWebsiteButton 
              isSidebarOpen={isSidebarOpen} 
              onBackToWebsite={handleBackToWebsite} 
            />

            {/* Visual Separator */}
            <div className="w-8 h-px bg-gray-700 mx-auto my-4"></div>

            {/* User Status Indicator - Shows for all users */}
            <StatusIndicator 
              userStatus={userStatus} 
              isExpanded={isSidebarOpen} 
            />

            {/* Upgrade Prompt - Shows for expired/canceled users */}
            <UpgradePrompt 
              userStatus={userStatus} 
              isExpanded={isSidebarOpen} 
              onUpgrade={handleUpgrade} 
            />

            {/* Visual Separator */}
            <div className="w-8 h-px bg-gray-700 mx-auto my-4"></div>

            {/* Access Controlled Navigation - Adapts to user status */}
            <AccessControlledNavigation 
              isSidebarOpen={isSidebarOpen} 
              onNavigate={handleNavigation}
              onMobileNavigate={() => isMobile && setIsSidebarOpen(false)}
            />

            {/* Visual Separator */}
            <div className="w-8 h-px bg-gray-700 mx-auto my-4"></div>

            <CalendarSwitcherSection isSidebarOpen={isSidebarOpen} />

            {/* Visual Separator */}
            <div className="w-8 h-px bg-gray-700 mx-auto my-4"></div>

            <UserProfileSection 
              isSidebarOpen={isSidebarOpen} 
              onSignOut={handleSignOut} 
            />
          </div>
        )}
      </div>

      {/* Mobile Header - Only visible when sidebar is closed on mobile */}
      {isMobile && !isSidebarOpen && (
        <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-md border-b border-gray-700 z-30 flex items-center px-4" style={{ touchAction: 'pan-y' }}>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="ml-3 text-lg font-semibold text-white">{currentPageTitle}</h1>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 h-full ${isMobile && !isSidebarOpen ? 'pt-16' : ''}`} style={isMobile ? { overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' } : {}}>
        <main className="w-full h-full overflow-y-auto">
          {children}
        </main>
      </div>
      
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        userType={userStatus.userType}
      />
      </div>
    </AuthenticatedPageWrapper>
  );
}
