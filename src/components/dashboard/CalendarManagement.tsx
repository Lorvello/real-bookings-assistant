
import React, { useState } from 'react';
import { Calendar, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarSettingsDialog } from '@/components/calendar-settings/CalendarSettingsDialog';
import type { Calendar as CalendarType } from '@/types/calendar';

interface CalendarManagementProps {
  calendars: CalendarType[];
}

export function CalendarManagement({ calendars }: CalendarManagementProps) {
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const handleSettingsClick = (calendarId: string) => {
    setSelectedCalendarId(calendarId);
    setSettingsDialogOpen(true);
  };

  const selectedCalendar = calendars.find(cal => cal.id === selectedCalendarId);

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Your Calendars</CardTitle>
            <CardDescription>
              Manage your booking calendars and settings
            </CardDescription>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            New Calendar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {calendars.length > 0 ? (
          <div className="space-y-4">
            {calendars.map((calendar) => (
              <div key={calendar.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-border rounded-lg bg-background-secondary space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground">{calendar.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      Booking URL: /{calendar.slug}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Timezone: {calendar.timezone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end space-x-3 w-full sm:w-auto">
                  <Badge variant={calendar.is_active ? "default" : "secondary"} className="flex-shrink-0">
                    {calendar.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSettingsClick(calendar.id)}
                    className="flex-shrink-0"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No calendars yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first calendar to start accepting bookings
            </p>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Create Calendar
            </Button>
          </div>
        )}
      </CardContent>
      
      {/* Calendar Settings Dialog */}
      {selectedCalendarId && (
        <CalendarSettingsDialog
          open={settingsDialogOpen}
          onOpenChange={setSettingsDialogOpen}
          calendarId={selectedCalendarId}
          calendarName={selectedCalendar?.name}
        />
      )}
    </Card>
  );
}
