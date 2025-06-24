
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SidebarHeader } from '@/components/dashboard/SidebarHeader';
import { BackToWebsiteButton } from '@/components/dashboard/BackToWebsiteButton';
import { NavigationMenu } from '@/components/dashboard/NavigationMenu';
import { CalendarSwitcherSection } from '@/components/dashboard/CalendarSwitcherSection';
import { UserProfileSection } from '@/components/dashboard/UserProfileSection';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  return (
    <div className="flex h-screen bg-gray-900 w-full">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-gray-800 transition-all duration-300 ease-in-out flex-shrink-0 relative`}>
        <div className="flex h-full flex-col">
          <SidebarHeader 
            isSidebarOpen={isSidebarOpen} 
            onToggleSidebar={toggleSidebar} 
          />

          <BackToWebsiteButton 
            isSidebarOpen={isSidebarOpen} 
            onBackToWebsite={handleBackToWebsite} 
          />

          <NavigationMenu 
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
