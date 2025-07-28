import React, { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useStableAvailabilityState } from '@/hooks/useStableAvailabilityState';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';
import { AvailabilityTabs } from './AvailabilityTabs';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Settings } from 'lucide-react';
import { GuidedAvailabilityModal } from './GuidedAvailabilityModal';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const ConfigureAvailability: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { selectedCalendar, refreshCalendars, viewingAllCalendars } = useCalendarContext();
  const availabilityState = useStableAvailabilityState();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isGuidedModalOpen, setIsGuidedModalOpen] = useState(false);
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);
  const [isCompletingSetup, setIsCompletingSetup] = useState(false);

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
      
      await refreshCalendars();
      availabilityState.forceCheck();
      
      setIsGuidedModalOpen(false);
      
      toast({
        title: "Availability configured!",
        description: "Your availability schedule has been set up successfully.",
      });

      // Navigate to the schedule page after successful configuration
      navigate('/availability/schedule', { replace: true });
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
  }, [toast, availabilityState, refreshCalendars, navigate]);

  // Redirect authenticated users to login
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
                  <p className="text-muted-foreground">Please select a specific calendar to configure availability.</p>
                </div>
              ) : !selectedCalendar ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No calendar selected</p>
                </div>
              ) : (
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
                </div>
              )}
            </div>
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
      </div>
    </DashboardLayout>
  );
};