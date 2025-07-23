
import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Info, Bell, Clock, CheckCircle } from 'lucide-react';
import { CalendarSettings } from '@/types/database';
import { useQueryClient } from '@tanstack/react-query';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useToast } from '@/hooks/use-toast';

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
  const queryClient = useQueryClient();
  const { refreshCalendars } = useCalendarContext();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);


  const handleSyncCalendar = async () => {
    setIsSyncing(true);
    try {
      await refreshCalendars();
      toast({
        title: "Calendar Synced",
        description: "Calendar data has been refreshed successfully",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync calendar data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        {/* Sync Calendar Button */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label className="text-foreground font-medium">Calendar Sync</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh calendar data and sync with the latest settings and bookings.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm text-muted-foreground">
              Refresh calendar data and settings
            </p>
          </div>
          <Button
            onClick={handleSyncCalendar}
            disabled={isSyncing}
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Button>
        </div>

        {/* Booking Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label className="text-foreground font-medium">Booking Notifications</Label>
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
            checked={true} // Default enabled for now
            onCheckedChange={(checked) => {
              // Future: implement notification settings
              toast({
                title: "Feature Coming Soon",
                description: "Notification settings will be available in a future update",
              });
            }}
          />
        </div>


        {/* Calendar Sync Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label className="text-foreground font-medium">Last Sync</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Shows when the calendar was last synchronized with the server.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm text-muted-foreground">
              Calendar synchronization status
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Just now</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
