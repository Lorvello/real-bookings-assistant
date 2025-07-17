
import React, { useState } from 'react';
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
  const { defaultSchedule, createDefaultSchedule, DAYS, availability, refreshAvailability } = useDailyAvailabilityManager(() => {});
  const { calendars } = useCalendars();

  // Check if availability is configured (enhanced to detect configured availability immediately after setup)
  const isAvailabilityConfigured = () => {
    // If configuration was just completed, always show overview
    if (configurationCompleted) {
      console.log('Configuration completed flag is true, showing overview');
      return true;
    }
    
    if (!defaultSchedule) {
      console.log('No default schedule found, showing configuration');
      return false;
    }
    
    // More robust check for configured availability
    if (!availability) {
      console.log('No availability data found, showing configuration');
      return false;
    }
    
    // Show overview if at least some days are configured OR if we have database rules
    const hasConfiguredDays = DAYS.some(day => {
      const dayData = availability[day.key];
      return dayData && (
        (dayData.enabled && dayData.timeBlocks?.length > 0) ||
        (!dayData.enabled)
      );
    });
    
    // ENHANCED: Also check if we have any database rules (even default ones)
    const hasBasicConfig = defaultSchedule && (hasConfiguredDays || DAYS.some(day => availability[day.key]?.enabled));
    
    console.log('Availability check result:', {
      hasDefaultSchedule: !!defaultSchedule,
      hasConfiguredDays,
      hasBasicConfig,
      willShowOverview: hasBasicConfig
    });
    
    // Always show overview if we have a default schedule and some configuration
    return hasBasicConfig;
  };

  const handleConfigureAvailability = async () => {
    // Reset configuration completed flag when starting new configuration
    setConfigurationCompleted(false);
    
    // Check if user has any calendars first
    if (!calendars || calendars.length === 0) {
      // No calendars - show calendar creation dialog first
      setIsInitialSetupFlow(true);
      setIsCalendarDialogOpen(true);
      return;
    }
    
    // Has calendars - proceed with availability configuration
    setIsInitialSetupFlow(false);
    if (!defaultSchedule) {
      await createDefaultSchedule();
    }
    setIsGuidedModalOpen(true);
  };

  const handleCalendarCreated = async () => {
    setIsCalendarDialogOpen(false);
    setIsInitialSetupFlow(true);
    
    // CRITICAL FIX: Wait longer for calendar to be properly selected and availability data to load
    console.log('Calendar created, waiting for data to be available...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Force refresh of availability data
    if (refreshAvailability) {
      console.log('Refreshing availability data after calendar creation...');
      refreshAvailability();
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Open guided modal after calendar creation
    console.log('Opening guided modal after calendar creation...');
    setIsGuidedModalOpen(true);
  };

  const handleGuidedComplete = async () => {
    setIsGuidedModalOpen(false);
    
    // CRITICAL FIX: Force refresh of availability data first, then set completion flag
    console.log('Guided configuration completed, forcing data refresh...');
    
    // Multiple refresh attempts to ensure data is loaded
    if (refreshAvailability) {
      await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay for DB consistency
      refreshAvailability();
      
      // Second refresh to ensure all data is loaded
      await new Promise(resolve => setTimeout(resolve, 200));
      refreshAvailability();
    }
    
    // Wait for data to be actually available before setting completion flag
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // NOW set configuration completed flag to ensure overview is shown
    console.log('Setting configuration completed flag after data refresh');
    setConfigurationCompleted(true);
    
    // After a successful setup, ensure overview stays visible
    console.log('Configuration completed successfully, overview will be shown');
    
    // Force onChange to trigger any dependent updates
    if (refreshAvailability) {
      refreshAvailability();
    }
  };

  if (activeTab === 'schedule') {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-background via-card to-background/95">
          <div className="max-w-7xl mx-auto p-5">
            {!defaultSchedule ? (
              // Empty state - show guided configuration starter
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
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-medium"
                  >
                    Start Configuration
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Main Content - Left Side */}
                <div className="lg:col-span-3 space-y-8">
                  {/* Show overview if configured, otherwise show step-by-step */}
                  {isAvailabilityConfigured() ? (
                    <AvailabilityOverview onChange={refreshAvailability} />
                  ) : (
                    <StepByStepDayConfiguration />
                  )}
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
