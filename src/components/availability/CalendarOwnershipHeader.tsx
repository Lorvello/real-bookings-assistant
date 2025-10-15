
import React from 'react';
import { Calendar, User, Building2, Info } from 'lucide-react';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';
import { useCalendarContext } from '@/contexts/CalendarContext';
import type { Calendar as CalendarType } from '@/types/database';
import type { UserProfile } from '@/types/database';

interface CalendarOwnershipHeaderProps {
  selectedCalendar: CalendarType;
  profile: UserProfile;
  user: UserProfile;
}

export const CalendarOwnershipHeader: React.FC<CalendarOwnershipHeaderProps> = ({
  selectedCalendar,
  profile,
  user
}) => {
  const { viewingAllCalendars } = useCalendarContext();

  return (
    <div className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 px-4 py-3 bg-primary/5 rounded-lg border">
              <Calendar className="h-6 w-6 text-primary" />
              <div>
                <div className="text-lg font-semibold text-foreground">
                  {selectedCalendar.name}
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>Owner: {profile?.full_name || user?.email}</span>
                  {profile?.business_name && (
                    <>
                      <Building2 className="h-3 w-3 ml-2" />
                      <span>{profile.business_name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Toon info als we een specifieke kalender tonen terwijl gebruiker "Alle kalenders" heeft geselecteerd */}
            {viewingAllCalendars && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Availability is being set for specific calendar
                </span>
              </div>
            )}
          </div>
          
          <CalendarSwitcher hideAllCalendarsOption={true} />
        </div>
      </div>
    </div>
  );
};
