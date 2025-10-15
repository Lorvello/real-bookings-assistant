
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useCalendars } from '@/hooks/useCalendars';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { AvailabilityTabs } from './AvailabilityTabs';
import { AvailabilityContent } from './AvailabilityContent';
import { CalendarRequiredEmptyState } from '@/components/ui/CalendarRequiredEmptyState';
import { AccessBlockedOverlay } from '@/components/user-status/AccessBlockedOverlay';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import type { Calendar } from '@/types/database';

export const AvailabilityManager = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { selectedCalendar, viewingAllCalendars } = useCalendarContext();
  const { calendars } = useCalendars();
  const { userStatus, accessControl } = useUserStatus();
  const [activeTab, setActiveTab] = useState('schedule');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // OPTIMIZED: Single auth check with fast redirect
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, user]); // Minimal dependencies

  // Only show loading on INITIAL page load, not on tab switches
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="w-6 h-6 bg-primary rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  // Show message when "All Calendars" is selected
  if (viewingAllCalendars) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-lg p-8">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Select a specific calendar</h2>
          <p className="text-muted-foreground">
            Availability settings are configured per calendar. Please select a specific calendar from the header to manage its availability.
          </p>
        </div>
      </div>
    );
  }

  // Show message when no calendars exist
  if (calendars.length === 0) {
    return (
      <CalendarRequiredEmptyState
        title="Set Up Your Availability"
        description="Create a calendar first to configure your booking availability and schedule."
      />
    );
  }

  // Show message when no calendar is selected
  if (!selectedCalendar) {
    return (
      <CalendarRequiredEmptyState
        title="Select a Calendar"
        description="Choose a calendar to manage its availability settings."
        showCreateButton={false}
      />
    );
  }

  // Access control: Block editing for expired/inactive users, show read-only view
  if (userStatus.isExpired || !accessControl.canEditBookings) {
    return (
      <>
        <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-lg p-8">
          <AccessBlockedOverlay
            userStatus={userStatus}
            feature="Availability Settings"
            description="An active subscription is required to modify your availability settings. Your current settings remain visible below in read-only mode."
            onUpgrade={() => setShowSubscriptionModal(true)}
          />
        </div>

        {/* Show read-only availability below */}
        <div className="mt-6 opacity-50 pointer-events-none">
          <AvailabilityTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-lg p-4">
            <AvailabilityContent
              activeTab={activeTab}
            />
          </div>
        </div>

        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          userType={userStatus.userType}
        />
      </>
    );
  }

  return (
    <div>
      <AvailabilityTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-lg p-4">
        <AvailabilityContent
          activeTab={activeTab}
        />
      </div>
    </div>
  );
};
