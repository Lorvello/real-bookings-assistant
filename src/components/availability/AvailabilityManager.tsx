
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useCalendars } from '@/hooks/useCalendars';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useNavigationGuard } from '@/contexts/NavigationGuardContext';
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
  // Use the loading flag from THIS useCalendars instance so it always matches the
  // calendars array read below (avoids a two-instance mismatch where the context's
  // separate instance reports loaded while this one has not resolved yet).
  const { calendars, loading: calendarsLoading, refetch: refetchCalendars } = useCalendars();
  const { userStatus, accessControl } = useUserStatus();
  const [activeTab, setActiveTabRaw] = useState('schedule');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  // AVAILABILITY-CALENDARSWITCH-STILL-NOOP (IUX R53, exhaustive audit): the
  // Weekly-Hours <-> Date-Overrides tab switch is pure `activeTab` React
  // state (see AvailabilityTabs.tsx), NOT a route change, and unmounts
  // DailyAvailability exactly like the calendar switcher does. Same
  // guardedAction reuse as the calendar switchers; no new mechanism.
  const { guardedAction } = useNavigationGuard();
  const setActiveTab = (tab: string) => guardedAction(() => setActiveTabRaw(tab));

  // OPTIMIZED: Single auth check with fast redirect
  useEffect(() => {
    if (!authLoading && !user) {
      // AVAILABILITY-CALENDARSWITCH-STILL-NOOP (IUX R53, exhaustive audit):
      // idle-session-expiry (src/contexts/AuthContext.tsx's 30-minute
      // inactivity signOut()) flips `user` to null, which fires this effect
      // and would otherwise silently blow past a dirty Weekly-Hours surface.
      // Routed through guardedAction like every other exit path found in the
      // audit; `replace: true` is preserved for both the immediate and the
      // guarded-then-confirmed case.
      guardedAction(() => navigate('/login', { replace: true }));
    }
  }, [authLoading, user]); // Minimal dependencies

  // Exact-shape skeleton (weekly-hours rows + timezone panel) instead of a bare spinner,
  // so the real schedule cross-fades in rather than popping (MEGA_PLAN §3b / DoD §5).
  const loadingSkeleton = (
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

  // Only show loading on INITIAL page load, not on tab switches.
  if (authLoading) {
    return loadingSkeleton;
  }

  if (!user || !profile) {
    return null;
  }

  // Show all calendars overview when "All Calendars" is selected
  if (viewingAllCalendars) {
    return <AllCalendarsAvailability calendars={calendars} />;
  }

  // Gate the empty states strictly behind a REAL loaded flag. While calendars (and the
  // subsequent auto-select of a calendar) are still resolving, render the skeleton, NOT the
  // empty CTA. Otherwise the "create a calendar first" / "select a calendar" CTA flashes for
  // a tick between authLoading resolving and calendars resolving, making a saved schedule look
  // unsaved (RUX-2). Only render an empty CTA once loading has resolved AND the data is
  // genuinely empty.
  if (calendarsLoading) {
    return loadingSkeleton;
  }

  // Show message when no calendars exist (loading has resolved and there are genuinely none).
  if (calendars.length === 0) {
    return (
      <CalendarRequiredEmptyState
        title={t('availPage.emptyState.setup.title', 'Set Up Your Availability')}
        description={t('availPage.emptyState.setup.description', 'Create a calendar first to configure your booking availability and schedule.')}
        // AVAILABILITY-EMPTYSTATE-STALE-AFTER-CREATE (IUX R63 fix): this
        // component's own useCalendars() instance is deliberately separate
        // from CalendarContext's (RUX-2, see comment above) so its loading
        // flag never mismatches. That means creating a calendar here (via
        // this empty state's own CreateCalendarDialog) updates
        // CalendarContext but never told THIS instance to refetch, leaving
        // calendars.length stuck at 0 and this empty state stuck on screen
        // even though the calendar was created (proven live). Refetch this
        // instance directly once the dialog confirms creation.
        onCalendarCreated={refetchCalendars}
      />
    );
  }

  // Calendars exist but the auto-select effect has not committed a selection yet. This is a
  // transient loaded-but-not-resolved tick, not a genuine no-selection state, so keep showing
  // the skeleton rather than the "select a calendar" CTA.
  if (!selectedCalendar) {
    return loadingSkeleton;
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
