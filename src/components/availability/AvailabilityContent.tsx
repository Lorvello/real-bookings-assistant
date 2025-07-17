
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
import { useCalendars } from '@/hooks/useCalendars';

interface AvailabilityContentProps {
  activeTab: string;
}

export const AvailabilityContent: React.FC<AvailabilityContentProps> = ({
  activeTab
}) => {
  const [isGuidedModalOpen, setIsGuidedModalOpen] = React.useState(false);
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = React.useState(false);
  const [isInitialSetupFlow, setIsInitialSetupFlow] = React.useState(false);
  const [configurationCompleted, setConfigurationCompleted] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [setupState, setSetupState] = React.useState<'checking' | 'needs_calendar' | 'needs_config' | 'configured'>('checking');
  
  const { defaultSchedule, createDefaultSchedule, DAYS, availability, refreshAvailability } = useDailyAvailabilityManager(() => {});
  const { calendars, loading: calendarsLoading } = useCalendars();

  // State lock to prevent override during completion flow
  const [completionLock, setCompletionLock] = React.useState(false);

  // FIXED: State detection with proper completion priority and availability check
  React.useEffect(() => {
    // PRIORITY 1: Configuration just completed - maintain configured state
    if (configurationCompleted) {
      setSetupState('configured');
      return;
    }

    // PRIORITY 2: Completion lock active - maintain configured state
    if (completionLock) {
      setSetupState('configured');
      return;
    }

    // PRIORITY 3: Still loading calendars
    if (calendarsLoading) {
      setSetupState('checking');
      return;
    }

    // PRIORITY 4: No calendars - need calendar creation
    if (!calendars || calendars.length === 0) {
      setSetupState('needs_calendar');
      return;
    }

    // PRIORITY 5: Have calendars but no schedule - need configuration
    if (!defaultSchedule) {
      setSetupState('needs_config');
      return;
    }

    // PRIORITY 6: Check for configured availability - has rules that indicate setup is complete
    const hasValidAvailability = availability && Object.keys(availability).length > 0;
    const hasEnabledDays = Object.values(availability || {}).some(day => day.enabled && day.timeBlocks.length > 0);
    const isConfigured = defaultSchedule && hasValidAvailability && hasEnabledDays;
    
    setSetupState(isConfigured ? 'configured' : 'needs_config');
  }, [calendars, calendarsLoading, defaultSchedule, availability, configurationCompleted, completionLock]);

  const handleConfigureAvailability = async () => {
    setConfigurationCompleted(false);
    
    // Fast path: Open modals immediately without loading
    if (setupState === 'needs_calendar') {
      setIsInitialSetupFlow(true);
      setIsCalendarDialogOpen(true);
      return;
    }
    
    // Quick schedule creation if needed
    if (!defaultSchedule) {
      setIsRefreshing(true);
      try {
        await createDefaultSchedule();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setIsInitialSetupFlow(false);
    setIsGuidedModalOpen(true);
  };

  const handleCalendarCreated = async () => {
    setIsCalendarDialogOpen(false);
    setIsInitialSetupFlow(true);
    
    // OPTIMIZED: Immediate transition without waiting
    // State will update automatically via useEffect
    
    // Create schedule in background while opening modal
    if (!defaultSchedule) {
      createDefaultSchedule(); // Don't await - let it run in background
    }
    
    setIsGuidedModalOpen(true);
  };

  const handleGuidedComplete = async () => {
    // IMMEDIATE: Close modal and set completed state
    setIsGuidedModalOpen(false);
    setConfigurationCompleted(true);
    setCompletionLock(true);
    setSetupState('configured');
    
    // Clear completion lock after UI has stabilized  
    setTimeout(() => {
      setCompletionLock(false);
    }, 1000);
    
    // Refresh availability data in background
    if (refreshAvailability) {
      refreshAvailability();
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
