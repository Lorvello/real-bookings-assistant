
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
      <CardHeader className="pb-1 md:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xs md:text-lg text-foreground">Your Calendars</CardTitle>
            <CardDescription className="text-xxs md:text-sm">
              Manage your booking calendars and settings
            </CardDescription>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-6 md:h-10 px-2 md:px-4 text-xxs md:text-sm">
            <Plus className="h-2.5 w-2.5 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden md:inline">New Calendar</span>
            <span className="md:hidden">New</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 md:pt-6">
        {calendars.length > 0 ? (
          <div className="space-y-1 md:space-y-4">
            {calendars.map((calendar) => (
              <div key={calendar.id} className="flex items-center justify-between p-1.5 md:p-4 border border-border rounded-lg bg-background-secondary">
                <div className="flex items-center space-x-1.5 md:space-x-4 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <div className="w-4 h-4 md:w-10 md:h-10 bg-primary/20 rounded md:rounded-lg flex items-center justify-center">
                      <Calendar className="h-2.5 w-2.5 md:h-5 md:w-5 text-primary" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground text-xxs md:text-base truncate">{calendar.name}</h3>
                    <p className="text-xxxs md:text-sm text-muted-foreground truncate">
                      /{calendar.slug}
                    </p>
                    <p className="text-xxxs md:text-xs text-muted-foreground truncate">
                      {calendar.timezone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 md:space-x-3 flex-shrink-0">
                  <Badge variant={calendar.is_active ? "default" : "secondary"} className="text-xxxs md:text-xs px-1 md:px-2 py-0 md:py-1">
                    {calendar.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSettingsClick(calendar.id)}
                    className="h-6 md:h-8 px-1.5 md:px-3 text-xxxs md:text-sm min-w-[44px]"
                  >
                    <Settings className="h-2.5 w-2.5 md:h-4 md:w-4 mr-0.5 md:mr-2" />
                    <span className="hidden md:inline">Settings</span>
                    <span className="md:hidden">Set</span>
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
