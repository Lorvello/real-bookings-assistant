
import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Info, Globe, Calendar, Clock } from 'lucide-react';
import { StepByStepDayConfiguration } from './StepByStepDayConfiguration';
import { AvailabilityOverview } from './AvailabilityOverview';
import { DateOverrides } from './DateOverrides';
import { GuidedAvailabilityModal } from './GuidedAvailabilityModal';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';
import { COMPREHENSIVE_TIMEZONES } from './TimezoneData';
import { useDailyAvailabilityManager } from '@/hooks/useDailyAvailabilityManager';
import { useCalendarContext } from '@/contexts/CalendarContext';

interface AvailabilityContentProps {
  activeTab: string;
}

export const AvailabilityContent: React.FC<AvailabilityContentProps> = ({
  activeTab
}) => {
  const [isGuidedModalOpen, setIsGuidedModalOpen] = React.useState(false);
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [setupState, setSetupState] = React.useState<'checking' | 'needs_calendar' | 'needs_config' | 'configured'>('checking');
  
  const { calendars, loading: calendarsLoading, refreshCalendars } = useCalendarContext();
  const { defaultSchedule, createDefaultSchedule, DAYS, availability, refreshAvailability } = useDailyAvailabilityManager(() => {});
  
  // PHASE 1: Calendar Context Synchronization - refresh availability when calendars change
  React.useEffect(() => {
    if (!calendarsLoading && calendars.length > 0) {
      refreshAvailability();
    }
  }, [calendars, calendarsLoading, refreshAvailability]);

  // PHASE 4: Improved State Management - robust state detection with loading states
  React.useEffect(() => {
    console.log('Setup state detection:', { calendarsLoading, calendars: calendars?.length, defaultSchedule: !!defaultSchedule, availability: Object.keys(availability || {}).length });
    
    // Still loading calendars
    if (calendarsLoading) {
      setSetupState('checking');
      return;
    }

    // No calendars - need calendar creation
    if (!calendars || calendars.length === 0) {
      setSetupState('needs_calendar');
      return;
    }

    // Prevent premature state changes during refresh
    if (isRefreshing) {
      setSetupState('checking');
      return;
    }

    // No schedule - need configuration
    if (!defaultSchedule) {
      setSetupState('needs_config');
      return;
    }

    // Check if actually configured with real availability rules
    const hasValidAvailability = availability && Object.keys(availability).length > 0;
    const hasEnabledDays = Object.values(availability || {}).some(day => day.enabled && day.timeBlocks.length > 0);
    
    setSetupState(hasEnabledDays ? 'configured' : 'needs_config');
  }, [calendars, calendarsLoading, defaultSchedule, availability, isRefreshing]);

  const handleConfigureAvailability = async () => {
    console.log('Configure availability clicked, setupState:', setupState);
    
    // Open calendar creation if no calendar exists
    if (setupState === 'needs_calendar') {
      setIsCalendarDialogOpen(true);
      return;
    }
    
    // PHASE 2: Ensure schedule exists before opening modal
    if (!defaultSchedule) {
      setIsRefreshing(true);
      try {
        console.log('Creating default schedule before opening modal...');
        await createDefaultSchedule();
        console.log('Default schedule created, waiting for sync...');
        
        // Wait for availability manager to update
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Verify schedule was created
        if (!defaultSchedule) {
          throw new Error('Schedule creation failed');
        }
      } catch (error) {
        console.error('Error creating schedule:', error);
        setIsRefreshing(false);
        return;
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setIsGuidedModalOpen(true);
  };

  const handleCalendarCreated = async () => {
    setIsCalendarDialogOpen(false);
    setIsRefreshing(true);
    
    try {
      console.log('Calendar created, refreshing calendar context...');
      
      // PHASE 1: Refresh calendar context to get new calendar
      await refreshCalendars();
      
      console.log('Calendar context refreshed, waiting for sync...');
      await new Promise(resolve => setTimeout(resolve, 400));
      
      console.log('Now creating default schedule...');
      
      // PHASE 2: Create schedule with retry mechanism
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          await createDefaultSchedule();
          console.log('Default schedule created successfully');
          break;
        } catch (error) {
          retryCount++;
          console.warn(`Schedule creation attempt ${retryCount} failed:`, error);
          
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            throw error;
          }
        }
      }
      
      // PHASE 2: Verify schedule creation before opening modal
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Only open modal after schedule is actually created
      setIsGuidedModalOpen(true);
    } catch (error) {
      console.error('Error in calendar creation flow:', error);
      // Keep user informed but don't block them
      setIsRefreshing(false);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleGuidedComplete = async () => {
    console.log('Guided setup completed, refreshing state...');
    
    // PHASE 3: Ensure data is fully saved before closing modal
    setIsRefreshing(true);
    
    try {
      // Wait for any pending saves to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Refresh availability to get latest state
      await refreshAvailability();
      
      // Close modal after refresh
      setIsGuidedModalOpen(false);
      
      console.log('Setup completed successfully');
    } catch (error) {
      console.error('Error completing setup:', error);
      // Still close modal to avoid blocking user
      setIsGuidedModalOpen(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (activeTab === 'schedule') {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-background via-card to-background/95">
          <div className="max-w-7xl mx-auto p-5">
            {/* Loading state */}
            {setupState === 'checking' && (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                  <div className="w-8 h-8 bg-primary rounded-full animate-spin mx-auto"></div>
                  <p className="text-muted-foreground">Loading your availability settings...</p>
                </div>
              </div>
            )}

            {/* No calendar state - show configuration starter */}
            {(setupState === 'needs_calendar' || setupState === 'needs_config') && (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-6 max-w-md">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="p-3 bg-primary/20 rounded-2xl">
                      <Calendar className="h-8 w-8 text-primary" />
                    </div>
                    <div className="p-3 bg-primary/20 rounded-2xl">
                      <Clock className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h2 className="text-2xl font-bold text-foreground">Configure Your Availability</h2>
                    <p className="text-muted-foreground">
                      Set up your weekly schedule with our guided step-by-step process. 
                      We'll walk you through each day to ensure your availability is perfectly configured.
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleConfigureAvailability}
                    disabled={isRefreshing}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-medium"
                  >
                    {isRefreshing ? 'Setting up...' : 'Start Configuration'}
                  </Button>
                </div>
              </div>
            )}

            {/* Configured state - show overview */}
            {setupState === 'configured' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Main Content - Left Side */}
                <div className="lg:col-span-3 space-y-8">
                  <AvailabilityOverview onChange={refreshAvailability} />
                </div>

                {/* Sidebar - Right Side */}
                <div className="space-y-6">
                  {/* Timezone */}
                  <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl p-6 shadow-lg shadow-black/5">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-primary/20 rounded-2xl">
                        <Globe className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="text-sm font-medium text-foreground">Timezone</h3>
                    </div>
                    <Select defaultValue="Europe/Amsterdam">
                      <SelectTrigger className="w-full bg-background/80 border-border/60 rounded-2xl hover:border-primary/40 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border rounded-2xl max-h-80 overflow-y-auto">
                        {COMPREHENSIVE_TIMEZONES.map((timezone) => (
                          <SelectItem key={timezone.value} value={timezone.value}>
                            {timezone.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Guided Availability Modal */}
        <GuidedAvailabilityModal
          isOpen={isGuidedModalOpen}
          onClose={() => setIsGuidedModalOpen(false)}
          onComplete={handleGuidedComplete}
        />

        {/* Calendar Creation Dialog */}
        <CreateCalendarDialog
          open={isCalendarDialogOpen}
          onOpenChange={setIsCalendarDialogOpen}
          onCalendarCreated={handleCalendarCreated}
        />
      </>
    );
  }

  if (activeTab === 'overrides') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card to-background/95">
        <div className="max-w-7xl mx-auto p-5">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/20 rounded-2xl">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">
                  Schedule exceptions
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add dates when your availability differs from your standard working hours.
                </p>
              </div>
            </div>
            
            <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl p-5 shadow-lg shadow-black/5">
              <DateOverrides />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
