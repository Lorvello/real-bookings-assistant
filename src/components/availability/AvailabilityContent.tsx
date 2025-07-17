
import React, { useState, useEffect } from 'react';
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
  const [isGuidedModalOpen, setIsGuidedModalOpen] = useState(false);
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);
  const [isInitialSetupFlow, setIsInitialSetupFlow] = useState(false);
  const [configurationCompleted, setConfigurationCompleted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [setupState, setSetupState] = useState<'checking' | 'needs_calendar' | 'needs_config' | 'configured'>('checking');
  
  const { defaultSchedule, createDefaultSchedule, DAYS, availability, refreshAvailability } = useDailyAvailabilityManager(() => {});
  const { calendars, loading: calendarsLoading } = useCalendars();

  // Reliable state detection with proper loading states
  useEffect(() => {
    if (calendarsLoading || isRefreshing) {
      setSetupState('checking');
      return;
    }

    // Configuration was just completed - always show configured
    if (configurationCompleted) {
      console.log('Configuration completed flag is true, showing configured state');
      setSetupState('configured');
      return;
    }

    // No calendars - need calendar creation first
    if (!calendars || calendars.length === 0) {
      console.log('No calendars found, showing needs_calendar state');
      setSetupState('needs_calendar');
      return;
    }

    // Have calendars but no schedule - need configuration
    if (!defaultSchedule) {
      console.log('No default schedule found, showing needs_config state');
      setSetupState('needs_config');
      return;
    }

    // Have schedule but no availability data yet - still checking
    if (!availability) {
      console.log('No availability data found, still checking');
      setSetupState('checking');
      return;
    }

    // Check if availability is actually configured
    const hasConfiguredDays = DAYS.some(day => {
      const dayData = availability[day.key];
      return dayData && (
        (dayData.enabled && dayData.timeBlocks?.length > 0) ||
        (!dayData.enabled)
      );
    });

    const isConfigured = defaultSchedule && hasConfiguredDays;
    
    console.log('Setup state check result:', {
      hasCalendars: calendars.length > 0,
      hasDefaultSchedule: !!defaultSchedule,
      hasAvailability: !!availability,
      hasConfiguredDays,
      finalState: isConfigured ? 'configured' : 'needs_config'
    });

    setSetupState(isConfigured ? 'configured' : 'needs_config');
  }, [calendars, calendarsLoading, defaultSchedule, availability, configurationCompleted, isRefreshing, DAYS]);

  const handleConfigureAvailability = async () => {
    console.log('Starting configuration process...');
    setConfigurationCompleted(false);
    setIsRefreshing(true);
    
    try {
      // Check setup state and handle accordingly
      if (setupState === 'needs_calendar') {
        console.log('No calendars found, opening calendar creation dialog');
        setIsInitialSetupFlow(true);
        setIsCalendarDialogOpen(true);
        return;
      }
      
      // Create default schedule if needed
      if (!defaultSchedule) {
        console.log('Creating default schedule...');
        await createDefaultSchedule();
        // Wait for schedule to be created
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('Opening guided availability modal...');
      setIsInitialSetupFlow(false);
      setIsGuidedModalOpen(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCalendarCreated = async () => {
    console.log('Calendar created, starting availability setup...');
    setIsCalendarDialogOpen(false);
    setIsInitialSetupFlow(true);
    setIsRefreshing(true);
    
    try {
      // Wait for calendar to be available and setup state to update
      console.log('Waiting for calendar to be properly available...');
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts && (setupState === 'needs_calendar' || setupState === 'checking')) {
        await new Promise(resolve => setTimeout(resolve, 300));
        attempts++;
        console.log(`Waiting for setup state to update (attempt ${attempts}), current state:`, setupState);
      }
      
      // Create default schedule if still needed
      if (!defaultSchedule) {
        console.log('Creating default schedule after calendar creation...');
        await createDefaultSchedule();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('Opening guided modal after calendar creation...');
      setIsGuidedModalOpen(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleGuidedComplete = async () => {
    console.log('Guided configuration completed, processing completion...');
    setIsGuidedModalOpen(false);
    setIsRefreshing(true);
    
    try {
      // Force refresh of availability data
      console.log('Refreshing availability data after configuration...');
      if (refreshAvailability) {
        refreshAvailability();
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Set completion flag to ensure configured state
      console.log('Setting configuration completed flag...');
      setConfigurationCompleted(true);
      
      // Additional refresh to ensure UI is updated
      if (refreshAvailability) {
        refreshAvailability();
      }
      
      console.log('Configuration completed successfully, user will see overview');
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
