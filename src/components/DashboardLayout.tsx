
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

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const { userStatus, accessControl } = useUserStatus();
  const { toast } = useToast();

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
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleUpgrade = () => {
    toast({
      title: "Upgrade Account",
      description: "Redirecting to upgrade options...",
    });
    navigate('/settings');
  };

  return (
    <div className="flex h-screen bg-gray-900 w-full relative">
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
            : `${isSidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 ease-in-out flex-shrink-0 relative opacity-100 pointer-events-auto`
          }
        `}
        style={{ backgroundColor: '#0F172A' }}
      >
        {/* Only render sidebar content when visible on mobile or always on desktop */}
        {(!isMobile || isSidebarOpen) && (
          <div className="flex h-full flex-col">
            <SidebarHeader 
              isSidebarOpen={isSidebarOpen} 
              onToggleSidebar={toggleSidebar}
              isMobile={isMobile}
            />

            <BackToWebsiteButton 
              isSidebarOpen={isSidebarOpen} 
              onBackToWebsite={handleBackToWebsite} 
            />

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

            {/* Access Controlled Navigation - Adapts to user status */}
            <AccessControlledNavigation 
              isSidebarOpen={isSidebarOpen} 
              onNavigate={handleNavigation}
              onMobileNavigate={() => isMobile && setIsSidebarOpen(false)}
            />

            <CalendarSwitcherSection isSidebarOpen={isSidebarOpen} />

            <UserProfileSection 
              isSidebarOpen={isSidebarOpen} 
              onSignOut={handleSignOut} 
            />
          </div>
        )}
      </div>

      {/* Mobile Header - Only visible when sidebar is closed on mobile */}
      {isMobile && !isSidebarOpen && (
        <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-md border-b border-gray-700 z-30 flex items-center px-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="ml-3 text-lg font-semibold text-white">Dashboard</h1>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 overflow-auto ${isMobile && !isSidebarOpen ? 'pt-16' : ''}`}>
        <main className="h-full">
          {children}
        </main>
      </div>
    </div>
  );
}
