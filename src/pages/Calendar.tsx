
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CalendarView } from '@/components/CalendarView';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';

const Calendar = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCalendar, calendars, viewingAllCalendars, getActiveCalendarIds, loading: calendarsLoading } = useCalendarContext();
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

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
        <div className="bg-gray-900 min-h-full p-3 md:p-8">
          <div className="space-y-4 md:space-y-6">
            {/* Calendar Header */}
            <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-2 md:p-4">
              <h1 className="text-base md:text-xl font-bold text-white">Calendar</h1>
              <p className="text-gray-400 mt-1 text-xs md:text-sm">
                Create your first calendar to start managing appointments
              </p>
            </div>

            {/* Create Calendar Section */}
            <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-lg p-8">
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <CalendarIcon className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-100 mb-2">Create Your First Calendar</h2>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Get started by creating a calendar to organize your appointments and availability.
                  </p>
                </div>
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-white"
                  size="lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Calendar
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <CreateCalendarDialog 
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
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
          <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-2 md:p-4">
            <h1 className="text-base md:text-xl font-bold text-white">{displayTitle}</h1>
            <p className="text-gray-400 mt-1 text-xs md:text-sm">
              {viewingAllCalendars 
                ? `Manage appointments from ${calendars.length} calendars`
                : 'Manage your appointments and availability'
              }
            </p>
          </div>

          {/* Calendar Content */}
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-lg p-2 md:p-4">
            <CalendarView calendarIds={activeCalendarIds} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
