
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarContext } from '@/contexts/CalendarContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCalendar, calendars, viewingAllCalendars, getActiveCalendarIds, loading: calendarsLoading } = useCalendarContext();

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
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Laden...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  const activeCalendarIds = getActiveCalendarIds();
  const calendarName = viewingAllCalendars 
    ? 'Alle kalenders' 
    : selectedCalendar?.name || 'Dashboard';

  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Overzicht van je bookings en prestaties
          </p>
        </div>

        {/* Dashboard Content with Clean Styling */}
        <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
          <DashboardContent 
            calendarIds={activeCalendarIds}
            calendarName={calendarName}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
