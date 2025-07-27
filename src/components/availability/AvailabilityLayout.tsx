import React, { useState } from 'react';
import { Settings, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useAvailabilityManager } from '@/hooks/availability/useAvailabilityManager';
import { LoadingState } from './common/LoadingState';
import { ErrorBoundary } from './common/ErrorBoundary';
import { SetupWizard } from './setup/SetupWizard';
import { WeeklySchedule } from './schedule/WeeklySchedule';
import { TimezoneSelector } from './timezone/TimezoneSelector';
import { DateOverrides } from './DateOverrides';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';

export const AvailabilityLayout: React.FC = () => {
  const { selectedCalendar, refreshCalendars } = useCalendarContext();
  const availabilityManager = useAvailabilityManager();
  const [activeTab, setActiveTab] = useState('schedule');
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);

  const handleConfigureAvailability = () => {
    if (!selectedCalendar) {
      setIsCalendarDialogOpen(true);
    } else {
      setIsSetupWizardOpen(true);
    }
  };

  const handleCalendarCreated = async () => {
    try {
      await refreshCalendars();
      setIsSetupWizardOpen(true);
    } catch (error) {
      console.error('Error after calendar creation:', error);
    }
  };

  const handleSetupComplete = async () => {
    setIsSetupWizardOpen(false);
    await availabilityManager.fetchAvailability();
  };

  // Loading state
  if (availabilityManager.loading) {
    return <LoadingState message="Loading availability settings..." />;
  }

  // Error state
  if (availabilityManager.error) {
    return (
      <ErrorBoundary
        error={availabilityManager.error}
        onRetry={availabilityManager.fetchAvailability}
      />
    );
  }

  // Setup needed state
  if (!selectedCalendar || !availabilityManager.isSetupComplete) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-3xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">Configure Your Availability</h2>
            <p className="text-muted-foreground text-lg">
              {!selectedCalendar 
                ? 'Create a calendar to start managing your availability schedule.'
                : 'Set up your availability schedule to start accepting bookings.'
              }
            </p>
          </div>

          <Button
            onClick={handleConfigureAvailability}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8"
          >
            <Settings className="w-5 h-5 mr-2" />
            {!selectedCalendar ? 'Create Calendar' : 'Configure Availability'}
          </Button>
        </div>

        {/* Modals */}
        <SetupWizard
          isOpen={isSetupWizardOpen}
          onClose={() => setIsSetupWizardOpen(false)}
          onComplete={handleSetupComplete}
        />

        <CreateCalendarDialog
          open={isCalendarDialogOpen}
          onOpenChange={setIsCalendarDialogOpen}
          onCalendarCreated={handleCalendarCreated}
        />
      </div>
    );
  }

  // Main availability interface
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedule" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="overrides" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Date Overrides</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main schedule */}
            <div className="lg:col-span-3">
              <WeeklySchedule
                weeklySchedule={availabilityManager.weeklySchedule}
                readOnly={false}
              />
            </div>
            
            {/* Timezone sidebar */}
            <div className="lg:col-span-1">
              <TimezoneSelector />
            </div>
          </div>

          {/* Setup wizard for reconfiguration */}
          <SetupWizard
            isOpen={isSetupWizardOpen}
            onClose={() => setIsSetupWizardOpen(false)}
            onComplete={handleSetupComplete}
          />
        </TabsContent>

        <TabsContent value="overrides">
          <DateOverrides />
        </TabsContent>
      </Tabs>
    </div>
  );
};