
import React from 'react';
import { ServiceTypesManager } from '@/components/ServiceTypesManager';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export function ServicesTab() {
  const { selectedCalendar, calendars } = useCalendarContext();

  if (calendars.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Geen kalender gevonden</h3>
            <p className="text-muted-foreground">
              Je hebt nog geen kalenders. Maak eerst een kalender aan om services te beheren.
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
              Selecteer een kalender om services te beheren.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ServiceTypesManager calendarId={selectedCalendar.id} />
    </div>
  );
}
