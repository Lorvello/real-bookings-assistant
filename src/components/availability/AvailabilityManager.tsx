
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useCalendars } from '@/hooks/useCalendars';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { AvailabilityTabs } from './AvailabilityTabs';
import { AvailabilityContent } from './AvailabilityContent';
import { AllCalendarsAvailability } from './AllCalendarsAvailability';
import { CalendarRequiredEmptyState } from '@/components/ui/CalendarRequiredEmptyState';
import { AccessBlockedOverlay } from '@/components/user-status/AccessBlockedOverlay';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import type { Calendar } from '@/types/database';

export const AvailabilityManager = () => {
  const { t } = useTranslation('appPages');
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

  // Only show loading on INITIAL page load, not on tab switches.
  // Exact-shape skeleton (weekly-hours rows + timezone panel) instead of a bare spinner,
  // so the real schedule cross-fades in rather than popping (MEGA_PLAN §3b / DoD §5).
  if (authLoading) {
    return (
      <div className="grid gap-6 p-1 md:p-2 lg:grid-cols-3">
        <div className="surface-raised rounded-xl p-6 lg:col-span-2">
          <div className="shimmer h-5 w-32 rounded bg-white/[0.06]" />
          <div className="mt-6 space-y-4">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="shimmer h-5 w-9 rounded-full bg-white/[0.06]" />
                <div className="shimmer h-4 w-20 rounded bg-white/[0.05]" />
                <div className="shimmer ml-auto h-8 w-24 rounded-md bg-white/[0.05]" />
                <div className="shimmer h-8 w-24 rounded-md bg-white/[0.05]" />
              </div>
            ))}
          </div>
        </div>
        <div className="surface-raised rounded-xl p-6">
          <div className="shimmer h-4 w-24 rounded bg-white/[0.06]" />
          <div className="shimmer mt-4 h-5 w-40 rounded bg-white/[0.05]" />
          <div className="shimmer mt-3 h-8 w-20 rounded bg-white/[0.07]" />
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  // Show all calendars overview when "All Calendars" is selected
  if (viewingAllCalendars) {
    return <AllCalendarsAvailability calendars={calendars} />;
  }

  // Show message when no calendars exist
  if (calendars.length === 0) {
    return (
      <CalendarRequiredEmptyState
        title={t('availPage.emptyState.setup.title', 'Set Up Your Availability')}
        description={t('availPage.emptyState.setup.description', 'Create a calendar first to configure your booking availability and schedule.')}
      />
    );
  }

  // Show message when no calendar is selected
  if (!selectedCalendar) {
    return (
      <CalendarRequiredEmptyState
        title={t('availPage.emptyState.select.title', 'Select a Calendar')}
        description={t('availPage.emptyState.select.description', 'Choose a calendar to manage its availability settings.')}
        showCreateButton={false}
      />
    );
  }

  // Access control: Block editing for expired/inactive users, show read-only view
  if (userStatus.isExpired || !accessControl.canEditBookings) {
    return (
      <>
        <div className="surface-raised rounded-xl p-8">
          <AccessBlockedOverlay
            userStatus={userStatus}
            feature="Availability Settings"
            description={t('availPage.accessBlocked.description', 'An active subscription is required to modify your availability settings. Your current settings remain visible below in read-only mode.')}
            onUpgrade={() => setShowSubscriptionModal(true)}
          />
        </div>

        {/* Show read-only availability below */}
        <div className="mt-6 opacity-50 pointer-events-none">
          <AvailabilityTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <div className="surface-raised rounded-xl p-4">
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

      <div className="surface-raised rounded-xl p-4">
        <AvailabilityContent
          activeTab={activeTab}
        />
      </div>
    </div>
  );
};
