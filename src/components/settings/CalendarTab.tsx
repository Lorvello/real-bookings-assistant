
import React from 'react';
import { CalendarSettings } from '@/components/CalendarSettings';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export function CalendarTab() {
  const { selectedCalendar, calendars } = useCalendarContext();

  if (calendars.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No calendar found</h3>
            <p className="text-muted-foreground">
              You don't have any calendars yet. Create a calendar first to modify settings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!selectedCalendar) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No calendar selected</h3>
            <p className="text-muted-foreground">
              Select a calendar to modify settings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Calendar Settings</h2>
        <p className="text-muted-foreground">
          Manage settings for: <span className="font-medium">{selectedCalendar.name}</span>
        </p>
      </div>
      
      <CalendarSettings calendarId={selectedCalendar.id} />
    </div>
  );
}
