import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useStableAvailabilityState } from '@/hooks/useStableAvailabilityState';
import { AvailabilityOverview } from './AvailabilityOverview';
import { DateOverrides } from './DateOverrides';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, Settings } from 'lucide-react';
import { GuidedAvailabilityModal } from './GuidedAvailabilityModal';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';
import { TimezoneDisplay } from './TimezoneDisplay';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AvailabilityContentProps {
  activeTab: string;
}

export const AvailabilityContent: React.FC<AvailabilityContentProps> = ({ activeTab }) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { selectedCalendar, refreshCalendars } = useCalendarContext();
  
  // Production-optimized: Debug logging removed
  const { toast } = useToast();

  // OPTIMIZED: Single state source to prevent cascading updates
  const availabilityState = useStableAvailabilityState();

  // Modal and UI state - minimal to prevent re-renders
  const [isGuidedModalOpen, setIsGuidedModalOpen] = useState(false);
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);
  const [isCompletingSetup, setIsCompletingSetup] = useState(false);

  // OPTIMIZED: Stable timezone state
  const [localTimezone, setLocalTimezone] = useState(() => selectedCalendar?.timezone || 'UTC');

  // Synchronize localTimezone with selectedCalendar timezone changes
  useEffect(() => {
    if (selectedCalendar?.timezone && selectedCalendar.timezone !== localTimezone) {
      setLocalTimezone(selectedCalendar.timezone);
    }
  }, [selectedCalendar?.timezone]);

  // OPTIMIZED: Stable event handlers with useCallback to prevent re-renders
  const handleConfigureAvailability = useCallback(() => {
    if (!selectedCalendar) {
      setIsCalendarDialogOpen(true);
    } else {
      setIsGuidedModalOpen(true);
    }
  }, [selectedCalendar?.id]);

  const handleCalendarCreated = useCallback(async () => {
    try {
      availabilityState.setRefreshing(true);
      await refreshCalendars();
      setIsGuidedModalOpen(true);
    } catch (error) {
      console.error('Error after calendar creation:', error);
    } finally {
      availabilityState.setRefreshing(false);
    }
  }, [refreshCalendars]);

  const handleGuidedComplete = useCallback(async () => {
    try {
      setIsCompletingSetup(true);
      
      // Force refresh calendars and availability data
      await refreshCalendars();
      
      // Force localTimezone sync after refresh
      if (selectedCalendar?.timezone) {
        setLocalTimezone(selectedCalendar.timezone);
      }
      
      // Immediately close modal and force state refresh without race conditions
      setIsGuidedModalOpen(false);
      availabilityState.forceCheck();
      
      toast({
        title: "Availability configured!",
        description: "Your availability schedule has been set up successfully.",
      });
    } catch (error) {
      console.error('Error completing setup:', error);
      toast({
        title: "Error", 
        description: "There was an error completing your setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCompletingSetup(false);
    }
  }, [toast, availabilityState, refreshCalendars, selectedCalendar?.timezone]);

  const handleTimezoneChange = useCallback(async (newTimezone: string) => {
    if (!selectedCalendar) {
      console.error('❌ CRITICAL: No calendar selected for timezone change');
      toast({
        title: "Error",
        description: "No calendar selected. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }
    
    const previousTimezone = localTimezone;
    // Production: Timezone change initiated without debug logging
    
    // STOP LYING TO USERS - Do NOT update UI until database confirms save
    try {
      // Database write operation with error tracking
      const { data: updateData, error: updateError } = await supabase
        .from('calendars')
        .update({ timezone: newTimezone })
        .eq('id', selectedCalendar.id)
        .select('id, timezone');

      if (updateError) {
        throw new Error(`Database write failed: ${updateError.message}`);
      }

      if (!updateData || updateData.length === 0) {
        throw new Error('No calendar record was updated');
      }

      // Verify database contains correct value
      const { data: verifyData, error: verifyError } = await supabase
        .from('calendars')
        .select('id, name, timezone')
        .eq('id', selectedCalendar.id)
        .single();

      if (verifyError) {
        throw new Error(`Verification failed: ${verifyError.message}`);
      }

      if (!verifyData) {
        throw new Error('Calendar not found during verification');
      }

      if (verifyData.timezone !== newTimezone) {
        throw new Error(`Timezone mismatch: expected ${newTimezone}, got ${verifyData.timezone}`);
      }

      // Force refresh calendar context
      await refreshCalendars();

      // Update local state after calendar context is refreshed
      setLocalTimezone(newTimezone);
      
      toast({
        title: "Timezone updated successfully",
        description: `Calendar timezone changed to ${newTimezone}`,
      });
      
    } catch (error) {
      // Restore previous timezone on error
      setLocalTimezone(previousTimezone);
      
      toast({
        title: "Failed to save timezone",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  }, [selectedCalendar?.id, localTimezone, refreshCalendars, toast]);

  // Only show loading on INITIAL page load, not during tab switches or refreshes
  if (availabilityState.setupState === 'checking' && !availabilityState.selectedCalendar) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  if (activeTab === 'schedule') {
    // OPTIMIZED: Instant state resolution - show final content immediately
    if (availabilityState.setupState === 'needs_calendar' || availabilityState.setupState === 'needs_config') {
      return (
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-3xl p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto">
              <CalendarIcon className="h-8 w-8 text-primary" />
            </div>
            
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">Configure Your Availability</h2>
              <p className="text-muted-foreground text-lg">
                {availabilityState.setupState === 'needs_calendar' 
                  ? 'Create a calendar to start managing your availability schedule.'
                  : 'Set up your availability schedule to start accepting bookings.'
                }
              </p>
            </div>

            <Button
              onClick={handleConfigureAvailability}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8"
              disabled={isCompletingSetup}
            >
              <Settings className="w-5 h-5 mr-2" />
              {availabilityState.setupState === 'needs_calendar' ? 'Create Calendar' : 'Configure Availability'}
            </Button>
          </div>

          {/* Modals */}
          <GuidedAvailabilityModal
            isOpen={isGuidedModalOpen}
            onClose={() => setIsGuidedModalOpen(false)}
            onComplete={handleGuidedComplete}
            selectedCalendar={selectedCalendar ? { id: selectedCalendar.id, timezone: selectedCalendar.timezone } : undefined}
            refreshCalendars={refreshCalendars}
          />

          <CreateCalendarDialog
            open={isCalendarDialogOpen}
            onOpenChange={setIsCalendarDialogOpen}
            onCalendarCreated={handleCalendarCreated}
          />
        </div>
      );
    }

    // OPTIMIZED: Direct rendering of configured state
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main availability overview */}
        <div className="lg:col-span-3">
          <AvailabilityOverview onChange={() => {}} />
        </div>
        
        {/* Timezone display sidebar */}
        <div className="lg:col-span-1">
          <TimezoneDisplay 
            currentTimezone={localTimezone}
            onTimezoneChange={handleTimezoneChange}
          />
        </div>

        <GuidedAvailabilityModal
          isOpen={isGuidedModalOpen}
          onClose={() => setIsGuidedModalOpen(false)}
          onComplete={handleGuidedComplete}
          editMode={true}
          selectedCalendar={selectedCalendar ? { id: selectedCalendar.id, timezone: selectedCalendar.timezone } : undefined}
          refreshCalendars={refreshCalendars}
        />
      </div>
    );
  }

  if (activeTab === 'overrides') {
    return <DateOverrides />;
  }

  return null;
};