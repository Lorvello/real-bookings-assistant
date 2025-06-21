
import React from 'react';
import { Calendar, User, Building2 } from 'lucide-react';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';
import type { Calendar as CalendarType } from '@/types/database';
import type { Tables } from '@/integrations/supabase/types';

interface CalendarOwnershipHeaderProps {
  selectedCalendar: CalendarType;
  profile: any;
  user: Tables<'users'>;
}

export const CalendarOwnershipHeader: React.FC<CalendarOwnershipHeaderProps> = ({
  selectedCalendar,
  profile,
  user
}) => {
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
                  <span>Eigenaar: {profile?.full_name || user?.email}</span>
                  {profile?.business_name && (
                    <>
                      <Building2 className="h-3 w-3 ml-2" />
                      <span>{profile.business_name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <CalendarSwitcher />
        </div>
      </div>
    </div>
  );
};
