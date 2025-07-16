
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CalendarView } from '@/components/CalendarView';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { SetupIncompleteOverlay } from '@/components/onboarding/SetupIncompleteOverlay';

const Calendar = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCalendar, calendars, viewingAllCalendars, getActiveCalendarIds, loading: calendarsLoading } = useCalendarContext();
  const { userStatus } = useUserStatus();

  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || calendarsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-center">
            <div className="w-6 h-6 bg-green-600 rounded-full animate-spin mx-auto mb-3"></div>
            <div className="text-base text-gray-300">Loading Calendar...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  if (calendars.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-center">
            <div className="text-base text-gray-300">No calendar found</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const activeCalendarIds = getActiveCalendarIds();
  const displayTitle = viewingAllCalendars 
    ? 'All calendars' 
    : selectedCalendar?.name || 'Calendar';

  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-3 md:p-8">
        <div className="space-y-4 md:space-y-6">
          {/* Calendar Header */}
          <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-3 md:p-6">
            <h1 className="text-lg md:text-3xl font-bold text-white">{displayTitle}</h1>
            <p className="text-gray-400 mt-1 text-xs md:text-base">
              {viewingAllCalendars 
                ? `Manage appointments from ${calendars.length} calendars`
                : 'Manage your appointments and availability'
              }
            </p>
          </div>

          {/* Calendar Content with Clean Styling */}
          {userStatus.isSetupIncomplete ? (
            <SetupIncompleteOverlay>
              <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-lg p-2 md:p-4">
                <CalendarView calendarIds={activeCalendarIds} />
              </div>
            </SetupIncompleteOverlay>
          ) : (
            <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-lg p-2 md:p-4">
              <CalendarView calendarIds={activeCalendarIds} />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
