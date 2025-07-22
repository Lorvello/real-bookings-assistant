
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
  const { signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const { userStatus, accessControl } = useUserStatus();
  const { toast } = useToast();

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
    <div className="flex h-screen bg-gray-900 w-full">
      {/* Sidebar */}
      <div 
        className={`${isSidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 ease-in-out flex-shrink-0 relative`}
        style={{ backgroundColor: '#0F172A' }}
      >
        <div className="flex h-full flex-col">
          <SidebarHeader 
            isSidebarOpen={isSidebarOpen} 
            onToggleSidebar={toggleSidebar} 
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
          />

          <CalendarSwitcherSection isSidebarOpen={isSidebarOpen} />

          <UserProfileSection 
            isSidebarOpen={isSidebarOpen} 
            onSignOut={handleSignOut} 
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="h-full">
          {children}
        </main>
      </div>
    </div>
  );
}
