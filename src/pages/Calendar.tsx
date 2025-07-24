
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CalendarView } from '@/components/CalendarView';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
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
            <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
            <div className="text-base text-muted-foreground">Loading Calendar...</div>
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
            <SimplePageHeader title="Calendar" />

            {/* Create Calendar Section */}
            <div className="bg-card border border-border shadow-sm rounded-lg p-8">
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <CalendarIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">Create Your First Calendar</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Get started by creating a calendar to organize your appointments and availability.
                  </p>
                </div>
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
          <SimplePageHeader title={displayTitle} />
          
          {/* Calendar Switcher */}
          <div className="mb-6">
            <CalendarSwitcher />
          </div>

          {/* Calendar Content */}
          <div className="bg-card border border-border shadow-sm rounded-lg p-2 md:p-4">
            <CalendarView calendarIds={activeCalendarIds} viewingAllCalendars={viewingAllCalendars} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
