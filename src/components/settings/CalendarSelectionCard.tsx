import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';

interface CalendarSelectionCardProps {
  hideAllCalendarsOption?: boolean;
}

export function CalendarSelectionCard({ hideAllCalendarsOption = false }: CalendarSelectionCardProps) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground text-lg">Calendar Selected</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose which calendar to manage settings for
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <CalendarSwitcher hideAllCalendarsOption={hideAllCalendarsOption} />
      </CardContent>
    </Card>
  );
}