
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [timezoneValue, setTimezoneValue] = React.useState<string>('Europe/Amsterdam');
  const [isTimezoneUpdating, setIsTimezoneUpdating] = React.useState(false);
  
  // OPTIMIZATION: Cache configuration existence for instant navigation
  const [configurationExists, setConfigurationExists] = React.useState<boolean | null>(null);
  const configurationCheckRef = React.useRef<boolean>(false);
  
  const { calendars, selectedCalendar, loading: calendarsLoading, refreshCalendars } = useCalendarContext();
  const { defaultSchedule, createDefaultSchedule, DAYS, availability, refreshAvailability, forceRefresh } = useDailyAvailabilityManager(() => {});
  const { toast } = useToast();
  
  // Update timezone value when selected calendar changes
  React.useEffect(() => {
    if (selectedCalendar?.timezone) {
      setTimezoneValue(selectedCalendar.timezone);
    }
  }, [selectedCalendar?.timezone]);

  // OPTIMIZATION: Pre-load configuration detection on mount
  React.useEffect(() => {
    const checkConfigurationExists = async () => {
      if (!selectedCalendar?.id || configurationCheckRef.current) return;
      
      configurationCheckRef.current = true;
      try {
        const { data: rules } = await supabase
          .from('availability_rules')
          .select('id')
          .eq('schedule_id', defaultSchedule?.id)
          .eq('is_available', true)
          .limit(1);
        
        const hasConfig = rules && rules.length > 0;
        setConfigurationExists(hasConfig);
        console.log('📊 Configuration check complete:', hasConfig ? 'CONFIGURED' : 'NEEDS_CONFIG');
      } catch (error) {
        console.error('Error checking configuration:', error);
        setConfigurationExists(false);
      }
    };

    if (selectedCalendar?.id && defaultSchedule?.id) {
      checkConfigurationExists();
    }
  }, [selectedCalendar?.id, defaultSchedule?.id]);

  // FIXED: Prevent circular dependencies
  React.useEffect(() => {
    if (!calendarsLoading && calendars.length > 0) {
      refreshAvailability();
    }
  }, [calendarsLoading, calendars?.length]); // FIXED: Remove refreshAvailability dependency

  // OPTIMIZED: Smart setup state logic with cached configuration
  React.useEffect(() => {
    if (calendarsLoading) {
      setSetupState('checking');
      return;
    }

    if (!calendars || calendars.length === 0) {
      setSetupState('needs_calendar');
      return;
    }

    if (isRefreshing) {
      setSetupState('checking');
      return;
    }

    if (!defaultSchedule) {
      setSetupState('needs_config');
      return;
    }

    // PRIORITY 1: Use cached configuration status for instant navigation
    if (configurationExists !== null) {
      setSetupState(configurationExists ? 'configured' : 'needs_config');
      return;
    }

    // FALLBACK: Check availability data if cache not available
    const hasValidAvailability = availability && Object.keys(availability).length > 0;
    const hasEnabledDays = Object.values(availability || {}).some(day => day.enabled && day.timeBlocks.length > 0);
    
    setSetupState(hasEnabledDays ? 'configured' : 'needs_config');
  }, [calendarsLoading, calendars?.length, defaultSchedule?.id, isRefreshing, configurationExists]); // OPTIMIZED: Include cached status

  const handleConfigureAvailability = async () => {
    try {
      setIsRefreshing(true);
      
      // Open calendar creation if no calendar exists
      if (setupState === 'needs_calendar') {
        setIsCalendarDialogOpen(true);
        return;
      }
      
      // Ensure schedule exists before opening modal
      if (!defaultSchedule) {
        await createDefaultSchedule();
      }
      
      setIsGuidedModalOpen(true);
    } catch (error) {
      console.error('Error configuring availability:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCalendarCreated = async () => {
    setIsCalendarDialogOpen(false);
    setIsRefreshing(true);
    
    try {
      // Refresh calendar context to get new calendar
      await refreshCalendars();
      
      // Create default schedule
      await createDefaultSchedule();
      
      // Open modal after schedule is created
      setIsGuidedModalOpen(true);
    } catch (error) {
      console.error('Error in calendar creation flow:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleGuidedComplete = React.useCallback(async () => {
    console.log('🎯 Guided availability setup completed - immediate transition to configured state');
    setIsGuidedModalOpen(false);
    
    // IMMEDIATE: Update cached configuration status and UI state
    setConfigurationExists(true);
    setSetupState('configured');
    
    try {
      console.log('🔄 Starting optimized post-setup refresh...');
      // OPTIMIZED: Fast refresh without artificial delays
      await forceRefresh();
      console.log('✅ Fast refresh completed after guided setup');
      
      toast({
        title: "Availability Configured",
        description: "Your weekly schedule has been successfully saved.",
      });
    } catch (error) {
      console.error('❌ Error during refresh:', error);
      toast({
        title: "Refresh Error", 
        description: "Your settings were saved but there was an issue refreshing. Please refresh the page.",
        variant: "destructive",
      });
    }
  }, [forceRefresh, toast]);

  const handleTimezoneChange = async (newTimezone: string) => {
    if (!selectedCalendar?.id) {
      toast({
        title: "Error",
        description: "No calendar selected",
        variant: "destructive",
      });
      return;
    }

    setIsTimezoneUpdating(true);
    try {
      const { error } = await supabase
        .from('calendars')
        .update({ timezone: newTimezone })
        .eq('id', selectedCalendar.id);

      if (error) {
        throw error;
      }

      setTimezoneValue(newTimezone);
      toast({
        title: "Timezone Updated",
        description: `Timezone changed to ${COMPREHENSIVE_TIMEZONES.find(tz => tz.value === newTimezone)?.label}`,
      });
      
      // Refresh calendars to get updated timezone
      refreshCalendars();
    } catch (error) {
      console.error('Error updating timezone:', error);
      toast({
        title: "Error",
        description: "Failed to update timezone. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTimezoneUpdating(false);
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
                    <Select 
                      value={timezoneValue} 
                      onValueChange={handleTimezoneChange}
                      disabled={isTimezoneUpdating}
                    >
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
          selectedCalendar={selectedCalendar ? { id: selectedCalendar.id, timezone: selectedCalendar.timezone } : undefined}
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
          <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl p-5 shadow-lg shadow-black/5">
            <DateOverrides />
          </div>
        </div>
      </div>
    );
  }

  return null;
};
