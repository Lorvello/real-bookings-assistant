
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Bell } from 'lucide-react';
import { CalendarSettings } from '@/types/database';

interface CalendarBasicSettingsProps {
  settings: CalendarSettings;
  onUpdate: (updates: Partial<CalendarSettings>) => void;
  calendarName?: string;
  onUpdateCalendarName?: (name: string) => void;
  calendarId?: string;
}

export function CalendarBasicSettings({ 
  settings, 
  onUpdate, 
  calendarId 
}: CalendarBasicSettingsProps) {
  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        {/* Booking Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label className="text-foreground font-medium">Booking Notifications</Label>
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send notifications when new bookings are made or cancelled.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm text-muted-foreground">
              Receive notifications for booking updates
            </p>
          </div>
          <Switch
            checked={false}
            disabled={true}
            className="opacity-50 cursor-not-allowed"
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
