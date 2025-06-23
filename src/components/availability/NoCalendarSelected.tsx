
import React from 'react';
import { User } from 'lucide-react';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';
import type { UserProfile } from '@/types/database';

interface NoCalendarSelectedProps {
  profile: UserProfile;
  user: UserProfile;
}

export const NoCalendarSelected: React.FC<NoCalendarSelectedProps> = ({
  profile,
  user
}) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Clear user context header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium text-foreground">
                {profile?.business_name || profile?.full_name || user?.email}
              </div>
              <div className="text-sm text-muted-foreground">Logged in as owner</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">No calendar selected</h1>
          <p className="text-muted-foreground mb-6">
            Select a calendar to manage availability.
          </p>
          <CalendarSwitcher />
        </div>
      </div>
    </div>
  );
};
