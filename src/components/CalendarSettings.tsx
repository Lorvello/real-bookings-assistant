import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { CalendarBasicSettings } from './calendar-settings/CalendarBasicSettings';
import { CalendarPolicySettings } from './calendar-settings/CalendarPolicySettings';
import { CalendarRequiredFields } from './calendar-settings/CalendarRequiredFields';
import { GlobalSettings } from './calendar-settings/GlobalSettings';
import { Separator } from '@/components/ui/separator';
interface CalendarSettingsProps {
  calendarId: string;
}
export function CalendarSettings({
  calendarId
}: CalendarSettingsProps) {
  const {
    settings,
    loading,
    updatePendingSettings,
    updateCalendarName
  } = useCalendarSettings(calendarId);
  const {
    selectedCalendar
  } = useCalendarContext();
  if (loading) {
    return <Card className="border-border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="w-8 h-8 bg-primary rounded-full animate-spin mx-auto"></div>
        </CardContent>
      </Card>;
  }
  if (!settings) {
    return <Card className="border-border">
        <CardContent className="p-8">
          <div className="text-center">
            <h3 className="text-lg font-medium text-foreground mb-2">
              No settings found
            </h3>
            <p className="text-muted-foreground">
              Settings will be created automatically when you make changes.
            </p>
          </div>
        </CardContent>
      </Card>;
  }
  return <div className="space-y-6">
      {/* Per-Calendar Settings */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Per-Calendar Settings</CardTitle>
          <p className="text-sm text-muted-foreground">
            Settings specific to {selectedCalendar?.name || 'this calendar'}
          </p>
        </CardHeader>
        <CardContent>
          <CalendarBasicSettings 
            settings={settings} 
            onUpdate={updatePendingSettings} 
            calendarName={selectedCalendar?.name} 
            onUpdateCalendarName={updateCalendarName} 
            calendarId={calendarId}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Booking Policies */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Booking Policies</CardTitle>
          <p className="text-sm text-muted-foreground">
            Settings specific to {selectedCalendar?.name || 'this calendar'}
          </p>
        </CardHeader>
        <CardContent>
          <CalendarPolicySettings settings={settings} onUpdate={updatePendingSettings} />
        </CardContent>
      </Card>

      <Separator />

      {/* Required Information */}
      
    </div>;
}