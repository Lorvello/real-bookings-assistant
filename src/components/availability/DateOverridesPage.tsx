import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';
import { AvailabilityTabs } from './AvailabilityTabs';
import { DateOverrides } from './DateOverrides';
import { useNavigate } from 'react-router-dom';

export const DateOverridesPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { viewingAllCalendars, selectedCalendar } = useCalendarContext();
  const navigate = useNavigate();

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
              activeTab="overrides" 
              onTabChange={(tab) => {
                if (tab === 'schedule') {
                  navigate('/availability/schedule');
                }
              }}
            />
            
            <div className="p-4">
              {viewingAllCalendars ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Please select a specific calendar to manage date overrides.</p>
                </div>
              ) : !selectedCalendar ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No calendar selected</p>
                </div>
              ) : (
                <DateOverrides />
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};