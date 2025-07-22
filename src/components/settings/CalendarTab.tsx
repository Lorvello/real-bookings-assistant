
import React from 'react';
import { CalendarSettings } from '@/components/CalendarSettings';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';

export function CalendarTab() {
  const { selectedCalendar, calendars } = useCalendarContext();
  const { saving } = useCalendarSettings(selectedCalendar?.id);

  if (calendars.length === 0) {
    return (
      <Card className="bg-card border-border">
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
      <Card className="bg-card border-border">
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
      {/* Auto-save indicator */}
      {saving && (
        <div className="flex items-center justify-center bg-blue-800/90 border border-blue-700/50 rounded-2xl shadow-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
            <p className="text-blue-200 text-sm">Saving...</p>
          </div>
        </div>
      )}
      
      <CalendarSettings calendarId={selectedCalendar.id} />
    </div>
  );
}
