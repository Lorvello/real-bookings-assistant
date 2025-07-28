import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';
import { AvailabilityTabs } from './AvailabilityTabs';
import { AvailabilityOverview } from './AvailabilityOverview';
import { TimezoneDisplay } from './TimezoneDisplay';
import { GuidedAvailabilityModal } from './GuidedAvailabilityModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const ManageAvailability: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { selectedCalendar, refreshCalendars, viewingAllCalendars } = useCalendarContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isGuidedModalOpen, setIsGuidedModalOpen] = useState(false);
  const [localTimezone, setLocalTimezone] = useState(() => selectedCalendar?.timezone || 'UTC');

  // Synchronize localTimezone with selectedCalendar timezone changes
  useEffect(() => {
    if (selectedCalendar?.timezone && selectedCalendar.timezone !== localTimezone) {
      setLocalTimezone(selectedCalendar.timezone);
    }
  }, [selectedCalendar?.timezone]);

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
    console.log(`🔥 TIMEZONE CHANGE INITIATED: ${previousTimezone} → ${newTimezone}`);
    
    try {
      console.log('💾 STEP 1: Writing to database...');
      
      const { data: updateData, error: updateError } = await supabase
        .from('calendars')
        .update({ timezone: newTimezone })
        .eq('id', selectedCalendar.id)
        .select('id, timezone');

      if (updateError) {
        console.error('❌ STEP 1 FAILED: Database write error:', updateError);
        throw new Error(`Database write failed: ${updateError.message}`);
      }

      if (!updateData || updateData.length === 0) {
        console.error('❌ STEP 1 FAILED: No rows updated');
        throw new Error('No calendar record was updated');
      }

      console.log('✅ STEP 1 SUCCESS: Database write completed', updateData);

      // Verification step
      const { data: verifyData, error: verifyError } = await supabase
        .from('calendars')
        .select('id, name, timezone')
        .eq('id', selectedCalendar.id)
        .single();

      if (verifyError) {
        console.error('❌ STEP 2 FAILED: Verification read error:', verifyError);
        throw new Error(`Verification failed: ${verifyError.message}`);
      }

      if (verifyData.timezone !== newTimezone) {
        console.error('❌ STEP 2 FAILED: Database contains wrong timezone:', {
          expected: newTimezone,
          actual: verifyData.timezone,
        });
        throw new Error(`Timezone mismatch: expected ${newTimezone}, got ${verifyData.timezone}`);
      }

      console.log('✅ STEP 2 SUCCESS: Database verification passed', verifyData);

      // Refresh calendar context and update local state
      await refreshCalendars();
      setLocalTimezone(newTimezone);
      
      toast({
        title: "Timezone updated successfully",
        description: `Calendar timezone changed to ${newTimezone}`,
      });
      
    } catch (error) {
      console.error('💥 TIMEZONE CHANGE FAILED:', error);
      
      setLocalTimezone(previousTimezone);
      
      toast({
        title: "Failed to save timezone",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  }, [selectedCalendar?.id, localTimezone, refreshCalendars, toast]);

  const handleGuidedComplete = useCallback(async () => {
    try {
      await refreshCalendars();
      
      if (selectedCalendar?.timezone) {
        setLocalTimezone(selectedCalendar.timezone);
      }
      
      setIsGuidedModalOpen(false);
      
      toast({
        title: "Availability updated!",
        description: "Your availability schedule has been updated successfully.",
      });
    } catch (error) {
      console.error('Error completing setup:', error);
      toast({
        title: "Error", 
        description: "There was an error updating your setup. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast, refreshCalendars, selectedCalendar?.timezone]);

  // Redirect unauthenticated users to login
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-base font-medium text-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    navigate('/login');
    return null;
  }

  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full md:min-h-full p-3 sm:p-4 md:p-8">
        <div className="space-y-3 sm:space-y-4 md:space-y-6">
          <SimplePageHeader title="Availability" />
          <CalendarSwitcher />
          
          <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-3xl overflow-hidden">
            <AvailabilityTabs 
              activeTab="schedule" 
              onTabChange={(tab) => {
                if (tab === 'overrides') {
                  navigate('/availability/overrides');
                }
              }}
            />
            
            <div className="p-4">
              {viewingAllCalendars ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Please select a specific calendar to manage availability.</p>
                </div>
              ) : !selectedCalendar ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No calendar selected</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Main availability overview */}
                  <div className="lg:col-span-3">
                    <AvailabilityOverview 
                      onChange={() => {}} 
                    />
                  </div>
                  
                  {/* Timezone display sidebar */}
                  <div className="lg:col-span-1">
                    <TimezoneDisplay 
                      currentTimezone={localTimezone}
                      onTimezoneChange={handleTimezoneChange}
                    />
                  </div>
                </div>
              )}
            </div>
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
      </div>
    </DashboardLayout>
  );
};