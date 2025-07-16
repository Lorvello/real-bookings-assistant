
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SidebarHeader } from '@/components/dashboard/SidebarHeader';
import { BackToWebsiteButton } from '@/components/dashboard/BackToWebsiteButton';
import { NavigationMenu } from '@/components/dashboard/NavigationMenu';
import { EnhancedNavigationMenu } from '@/components/trial/EnhancedNavigationMenu';
import { CalendarSwitcherSection } from '@/components/dashboard/CalendarSwitcherSection';
import { UserProfileSection } from '@/components/dashboard/UserProfileSection';
import { TrialCountdown } from '@/components/trial/TrialCountdown';
import { ProgressIndicator } from '@/components/trial/ProgressIndicator';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const { isTrialActive, daysRemaining } = useTrialStatus();
  const { completionPercentage, completedSteps, totalSteps } = useOnboardingProgress();

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

          {/* Trial Status Components - Only show for active trial users */}
          {isTrialActive && (
            <>
              <TrialCountdown 
                daysRemaining={daysRemaining} 
                isExpanded={isSidebarOpen} 
              />
              <ProgressIndicator 
                completionPercentage={completionPercentage}
                completedSteps={completedSteps}
                totalSteps={totalSteps}
                isExpanded={isSidebarOpen}
              />
            </>
          )}

          {/* Navigation Menu - Enhanced for trial users, normal for others */}
          {isTrialActive ? (
            <EnhancedNavigationMenu 
              isSidebarOpen={isSidebarOpen} 
              onNavigate={handleNavigation} 
            />
          ) : (
            <NavigationMenu 
              isSidebarOpen={isSidebarOpen} 
              onNavigate={handleNavigation} 
            />
          )}

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
