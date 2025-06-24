
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
            <h3 className="text-lg font-semibold text-foreground mb-2">Geen kalender gevonden</h3>
            <p className="text-muted-foreground">
              U heeft nog geen kalender. Maak eerst een kalender aan om instellingen te kunnen wijzigen.
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
            <h3 className="text-lg font-semibold text-foreground mb-2">Geen kalender geselecteerd</h3>
            <p className="text-muted-foreground">
              Selecteer een kalender om de instellingen te kunnen wijzigen.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Kalender Instellingen</h2>
        <p className="text-muted-foreground">
          Beheer de instellingen voor: <span className="font-medium">{selectedCalendar.name}</span>
        </p>
      </div>
      
      <CalendarSettings calendarId={selectedCalendar.id} />
    </div>
  );
}
